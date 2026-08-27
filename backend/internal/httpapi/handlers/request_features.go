package handlers

import (
	"fmt"
	"net/http"
	"net/mail"
	"net/url"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	httputil "github.com/rowjay007/referee-request/backend/internal/httpapi/middleware"
	"github.com/rowjay007/referee-request/backend/internal/httpapi/response"
	"github.com/rowjay007/referee-request/backend/internal/security"
	"github.com/rowjay007/referee-request/backend/internal/store"
)

type patchReferenceRequestPayload struct {
	UpdatedAt             string  `json:"updatedAt"`
	RefereeName           *string `json:"refereeName"`
	RefereeEmail          *string `json:"refereeEmail"`
	RefereeRelationship   *string `json:"refereeRelationship"`
	InstitutionName       *string `json:"institutionName"`
	ProgrammeName         *string `json:"programmeName"`
	OpportunityType       *string `json:"opportunityType"`
	DeadlineAt            *string `json:"deadlineAt"`
	Instructions          *string `json:"instructions"`
	ConfidentialityMode   *string `json:"confidentialityMode"`
	Organization          *string `json:"organization"`
	Role                  *string `json:"role"`
	CountryCode           *string `json:"countryCode"`
	ApplicationType       *string `json:"applicationType"`
	SubmissionMethod      *string `json:"submissionMethod"`
	PreferredCompletionAt *string `json:"preferredCompletionAt"`
	Timezone              *string `json:"timezone"`
	CandidateContext      *string `json:"candidateContext"`
	WhyApplying           *string `json:"whyApplying"`
	RelationshipContext   *string `json:"relationshipContext"`
	Traits                *string `json:"traits"`
	Achievements          *string `json:"achievements"`
}

func (h *ReferenceRequestHandler) Patch(w http.ResponseWriter, r *http.Request) {
	userID, requestID, ok := candidateRequestIDs(w, r)
	if !ok {
		return
	}
	payload := patchReferenceRequestPayload{}
	if err := decodeJSONBody(r, &payload, 128*1024); err != nil {
		response.ValidationError(w, map[string]any{"body": "Invalid JSON body."})
		return
	}
	expected, err := time.Parse(time.RFC3339Nano, payload.UpdatedAt)
	if err != nil {
		response.ValidationError(w, map[string]any{"updatedAt": "updatedAt must be an RFC3339 timestamp."})
		return
	}
	current, err := h.requests.GetReferenceRequestByIDForCandidate(r.Context(), requestID, userID)
	if err != nil {
		handleRequestStoreError(w, err)
		return
	}
	merged := payloadFromRequest(*current)
	applyPatchPayload(&merged, payload)
	normalizeRequestPayload(&merged)
	details := validateCreateReferenceRequest(merged)
	deadline, deadlineErr := time.Parse(time.RFC3339, merged.DeadlineAt)
	preferred, preferredErr := time.Parse(time.RFC3339, merged.PreferredCompletionAt)
	if deadlineErr != nil {
		details["deadlineAt"] = "Deadline must be an RFC3339 timestamp."
	}
	if preferredErr != nil {
		details["preferredCompletionAt"] = "Preferred completion must be an RFC3339 timestamp."
	}
	if len(details) > 0 {
		response.ValidationError(w, details)
		return
	}
	input := store.CreateReferenceRequestInput{
		CandidateUserID: userID, RefereeName: merged.RefereeName, RefereeEmail: merged.RefereeEmail,
		RefereeRelationship: merged.RefereeRelationship, InstitutionName: merged.InstitutionName,
		ProgrammeName: merged.ProgrammeName, OpportunityType: merged.OpportunityType, DeadlineAt: deadline.UTC(),
		Instructions: merged.Instructions, ConfidentialityMode: merged.ConfidentialityMode,
		Organization: merged.Organization, Role: merged.Role, CountryCode: merged.CountryCode,
		ApplicationType: merged.ApplicationType, SubmissionMethod: merged.SubmissionMethod,
		PreferredCompletionAt: &preferred, Timezone: merged.Timezone, CandidateContext: merged.CandidateContext,
		WhyApplying: merged.WhyApplying, RelationshipContext: merged.RelationshipContext,
		Traits: merged.Traits, Achievements: merged.Achievements,
	}
	updated, err := h.requests.UpdateDraft(r.Context(), store.UpdateDraftInput{Request: input, RequestID: requestID, ExpectedUpdated: expected})
	if err != nil {
		switch err {
		case store.ErrReferenceRequestNotDraft:
			response.Conflict(w, "REQUEST_NOT_DRAFT", "Only draft requests can be edited.")
		case store.ErrReferenceRequestEditConflict:
			response.Conflict(w, "REQUEST_EDIT_CONFLICT", "The request was changed. Reload it and try again.")
		default:
			handleRequestStoreError(w, err)
		}
		return
	}
	response.JSON(w, http.StatusOK, response.Envelope{Data: map[string]any{"request": requestToPayload(*updated)}})
}

type contactPayload struct {
	Name         string `json:"name"`
	Email        string `json:"email"`
	Relationship string `json:"relationship"`
}

func (h *ReferenceRequestHandler) ListContacts(w http.ResponseWriter, r *http.Request) {
	userID, ok := candidateUser(w, r)
	if !ok {
		return
	}
	contacts, err := h.requests.ListRefereeContacts(r.Context(), userID)
	if err != nil {
		response.InternalError(w)
		return
	}
	items := make([]map[string]any, 0, len(contacts))
	for _, contact := range contacts {
		items = append(items, contactToPayload(contact))
	}
	response.JSON(w, http.StatusOK, response.Envelope{Data: map[string]any{"contacts": items}})
}

func (h *ReferenceRequestHandler) CreateContact(w http.ResponseWriter, r *http.Request) {
	h.upsertContact(w, r, uuid.Nil)
}

func (h *ReferenceRequestHandler) UpdateContact(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "contactId"))
	if err != nil {
		response.ValidationError(w, map[string]any{"contactId": "Contact ID is invalid."})
		return
	}
	h.upsertContact(w, r, id)
}

func (h *ReferenceRequestHandler) upsertContact(w http.ResponseWriter, r *http.Request, id uuid.UUID) {
	userID, ok := candidateUser(w, r)
	if !ok {
		return
	}
	payload := contactPayload{}
	if err := decodeJSONBody(r, &payload, 32*1024); err != nil {
		response.ValidationError(w, map[string]any{"body": "Invalid JSON body."})
		return
	}
	payload.Name = strings.TrimSpace(payload.Name)
	payload.Email = strings.ToLower(strings.TrimSpace(payload.Email))
	payload.Relationship = strings.TrimSpace(payload.Relationship)
	if payload.Name == "" || payload.Email == "" {
		response.ValidationError(w, map[string]any{"contact": "Name and email are required."})
		return
	}
	if _, err := mail.ParseAddress(payload.Email); err != nil {
		response.ValidationError(w, map[string]any{"email": "Email is invalid."})
		return
	}
	input := store.RefereeContactInput{CandidateUserID: userID, Name: payload.Name, Email: payload.Email, Relationship: payload.Relationship}
	var contact *store.RefereeContact
	var err error
	status := http.StatusCreated
	if id == uuid.Nil {
		contact, err = h.requests.CreateRefereeContact(r.Context(), input)
	} else {
		status = http.StatusOK
		contact, err = h.requests.UpdateRefereeContact(r.Context(), id, input)
	}
	if err != nil {
		if err == store.ErrRefereeContactNotFound {
			response.NotFound(w, "CONTACT_NOT_FOUND", "Referee contact not found.")
		} else {
			response.InternalError(w)
		}
		return
	}
	response.JSON(w, status, response.Envelope{Data: map[string]any{"contact": contactToPayload(*contact)}})
}

func (h *ReferenceRequestHandler) DeleteContact(w http.ResponseWriter, r *http.Request) {
	userID, ok := candidateUser(w, r)
	if !ok {
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "contactId"))
	if err != nil {
		response.ValidationError(w, map[string]any{"contactId": "Contact ID is invalid."})
		return
	}
	if err := h.requests.DeleteRefereeContact(r.Context(), id, userID); err != nil {
		if err == store.ErrRefereeContactNotFound {
			response.NotFound(w, "CONTACT_NOT_FOUND", "Referee contact not found.")
		} else {
			response.InternalError(w)
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ReferenceRequestHandler) Repeat(w http.ResponseWriter, r *http.Request) {
	userID, requestID, ok := candidateRequestIDs(w, r)
	if !ok {
		return
	}
	payload := struct {
		ContactID *string `json:"contactId"`
	}{}
	if err := decodeJSONBody(r, &payload, 16*1024); err != nil {
		response.ValidationError(w, map[string]any{"body": "Invalid JSON body."})
		return
	}
	var contactID *uuid.UUID
	if payload.ContactID != nil {
		parsed, err := uuid.Parse(*payload.ContactID)
		if err != nil {
			response.ValidationError(w, map[string]any{"contactId": "Contact ID is invalid."})
			return
		}
		contactID = &parsed
	}
	request, err := h.requests.RepeatReferenceRequest(r.Context(), requestID, userID, contactID)
	if err != nil {
		handleRequestStoreError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, response.Envelope{Data: map[string]any{"request": requestToPayload(*request)}})
}

func (h *ReferenceRequestHandler) Outcome(w http.ResponseWriter, r *http.Request) {
	userID, requestID, ok := candidateRequestIDs(w, r)
	if !ok {
		return
	}
	payload := struct {
		Outcome string `json:"outcome"`
		Note    string `json:"note"`
	}{}
	if err := decodeJSONBody(r, &payload, 32*1024); err != nil {
		response.ValidationError(w, map[string]any{"body": "Invalid JSON body."})
		return
	}
	payload.Outcome = strings.ToLower(strings.TrimSpace(payload.Outcome))
	if payload.Outcome != "successful" && payload.Outcome != "unsuccessful" && payload.Outcome != "withdrawn" && payload.Outcome != "unknown" {
		response.ValidationError(w, map[string]any{"outcome": "Outcome must be successful, unsuccessful, withdrawn, or unknown."})
		return
	}
	request, err := h.requests.SetOutcome(r.Context(), store.OutcomeInput{RequestID: requestID, CandidateUserID: userID, Outcome: payload.Outcome, Note: strings.TrimSpace(payload.Note)})
	if err != nil {
		handleRequestStoreError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, response.Envelope{Data: map[string]any{"request": requestToPayload(*request)}})
}

func (h *ReferenceRequestHandler) Replace(w http.ResponseWriter, r *http.Request) {
	userID, requestID, ok := candidateRequestIDs(w, r)
	if !ok {
		return
	}
	payload := contactPayload{}
	if err := decodeJSONBody(r, &payload, 32*1024); err != nil {
		response.ValidationError(w, map[string]any{"body": "Invalid JSON body."})
		return
	}
	payload.Name, payload.Email, payload.Relationship = strings.TrimSpace(payload.Name), strings.ToLower(strings.TrimSpace(payload.Email)), strings.TrimSpace(payload.Relationship)
	if payload.Name == "" || payload.Email == "" {
		response.ValidationError(w, map[string]any{"referee": "Name and email are required."})
		return
	}
	if _, err := mail.ParseAddress(payload.Email); err != nil {
		response.ValidationError(w, map[string]any{"email": "Email is invalid."})
		return
	}
	token, err := security.GenerateRefereeToken()
	if err != nil {
		response.InternalError(w)
		return
	}
	link, err := url.JoinPath(h.cfg.FrontendBaseURL, "referee", token)
	if err != nil {
		response.InternalError(w)
		return
	}
	request, invitation, err := h.requests.ReplaceReferee(r.Context(), store.ReplacementInput{
		RequestID: requestID, CandidateUserID: userID, RefereeName: payload.Name, RefereeEmail: payload.Email,
		RefereeRelationship: payload.Relationship, TokenHash: security.HashRefereeToken(token),
		ExpiresAt: time.Now().UTC().Add(30 * 24 * time.Hour), RefereeLink: link,
	})
	if err != nil {
		if err == store.ErrReferenceRequestReplacementNotAllowed {
			response.Conflict(w, "REFEREE_REPLACEMENT_NOT_ALLOWED", "The referee cannot be replaced in this request state.")
		} else {
			handleRequestStoreError(w, err)
		}
		return
	}
	response.JSON(w, http.StatusOK, response.Envelope{Data: map[string]any{"request": requestToPayload(*request), "refereeLink": link, "tokenExpires": invitation.ExpiresAt.UTC().Format(time.RFC3339)}})
}

func (h *ReferenceRequestHandler) Invitations(w http.ResponseWriter, r *http.Request) {
	userID, requestID, ok := candidateRequestIDs(w, r)
	if !ok {
		return
	}
	items, err := h.requests.ListInvitationsForCandidate(r.Context(), requestID, userID)
	if err != nil {
		response.InternalError(w)
		return
	}
	result := make([]map[string]any, 0, len(items))
	for _, item := range items {
		result = append(result, map[string]any{"id": item.ID.String(), "refereeName": item.RefereeName, "refereeEmail": item.RefereeEmail,
			"refereeRelationship": item.RefereeRelationship, "expiresAt": item.ExpiresAt.UTC().Format(time.RFC3339),
			"deliveredAt": toOptionalRFC3339(item.DeliveredAt), "openedAt": toOptionalRFC3339(item.OpenedAt),
			"decision": item.Decision, "decidedAt": toOptionalRFC3339(item.DecidedAt), "inProgressAt": toOptionalRFC3339(item.InProgressAt),
			"submittedAt": toOptionalRFC3339(item.SubmittedAt), "revokedAt": toOptionalRFC3339(item.RevokedAt), "supersededAt": toOptionalRFC3339(item.SupersededAt)})
	}
	response.JSON(w, http.StatusOK, response.Envelope{Data: map[string]any{"invitations": result}})
}

func payloadFromRequest(request store.ReferenceRequest) createReferenceRequestPayload {
	return createReferenceRequestPayload{RefereeName: request.RefereeName, RefereeEmail: request.RefereeEmail,
		RefereeRelationship: request.RefereeRelationship, InstitutionName: request.InstitutionName, ProgrammeName: request.ProgrammeName,
		OpportunityType: request.OpportunityType, DeadlineAt: request.DeadlineAt.UTC().Format(time.RFC3339), Instructions: request.Instructions,
		ConfidentialityMode: request.ConfidentialityMode, Organization: request.Organization, Role: request.Role, CountryCode: request.CountryCode,
		ApplicationType: request.ApplicationType, SubmissionMethod: request.SubmissionMethod, PreferredCompletionAt: formatOptionalOr(request.PreferredCompletionAt, request.DeadlineAt),
		Timezone: request.Timezone, CandidateContext: request.CandidateContext, WhyApplying: request.WhyApplying,
		RelationshipContext: request.RelationshipContext, Traits: request.Traits, Achievements: request.Achievements}
}

func applyPatchPayload(target *createReferenceRequestPayload, patch patchReferenceRequestPayload) {
	assign := func(value *string, destination *string) {
		if value != nil {
			*destination = *value
		}
	}
	assign(patch.RefereeName, &target.RefereeName)
	assign(patch.RefereeEmail, &target.RefereeEmail)
	assign(patch.RefereeRelationship, &target.RefereeRelationship)
	assign(patch.InstitutionName, &target.InstitutionName)
	assign(patch.ProgrammeName, &target.ProgrammeName)
	assign(patch.OpportunityType, &target.OpportunityType)
	assign(patch.DeadlineAt, &target.DeadlineAt)
	assign(patch.Instructions, &target.Instructions)
	assign(patch.ConfidentialityMode, &target.ConfidentialityMode)
	assign(patch.Organization, &target.Organization)
	assign(patch.Role, &target.Role)
	assign(patch.CountryCode, &target.CountryCode)
	assign(patch.ApplicationType, &target.ApplicationType)
	assign(patch.SubmissionMethod, &target.SubmissionMethod)
	assign(patch.PreferredCompletionAt, &target.PreferredCompletionAt)
	assign(patch.Timezone, &target.Timezone)
	assign(patch.CandidateContext, &target.CandidateContext)
	assign(patch.WhyApplying, &target.WhyApplying)
	assign(patch.RelationshipContext, &target.RelationshipContext)
	assign(patch.Traits, &target.Traits)
	assign(patch.Achievements, &target.Achievements)
}

func formatOptionalOr(value *time.Time, fallback time.Time) string {
	if value != nil {
		return value.UTC().Format(time.RFC3339)
	}
	return fallback.UTC().Format(time.RFC3339)
}

func contactToPayload(contact store.RefereeContact) map[string]any {
	return map[string]any{"id": contact.ID.String(), "name": contact.Name, "email": contact.Email, "relationship": contact.Relationship,
		"createdAt": contact.CreatedAt.UTC().Format(time.RFC3339), "updatedAt": contact.UpdatedAt.UTC().Format(time.RFC3339Nano)}
}

func handleRequestStoreError(w http.ResponseWriter, err error) {
	switch err {
	case store.ErrReferenceRequestNotFound:
		response.NotFound(w, "REQUEST_NOT_FOUND", "Reference request not found.")
	case store.ErrRefereeContactNotFound:
		response.NotFound(w, "CONTACT_NOT_FOUND", "Referee contact not found.")
	default:
		response.InternalError(w)
	}
}

func candidateRequestIDs(w http.ResponseWriter, r *http.Request) (uuid.UUID, uuid.UUID, bool) {
	userID, ok := candidateUser(w, r)
	if !ok {
		return uuid.Nil, uuid.Nil, false
	}
	requestID, err := uuid.Parse(chi.URLParam(r, "requestId"))
	if err != nil {
		response.ValidationError(w, map[string]any{"requestId": "Request ID is invalid."})
		return uuid.Nil, uuid.Nil, false
	}
	return userID, requestID, true
}

func candidateUser(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	userID, ok := httputil.CandidateUserID(r.Context())
	if !ok {
		response.Unauthorized(w, "Authentication required.")
		return uuid.Nil, false
	}
	return userID, true
}

func (h *ReferenceRequestHandler) DownloadSubmittedReference(w http.ResponseWriter, r *http.Request) {
	userID, requestID, ok := candidateRequestIDs(w, r)
	if !ok {
		return
	}
	item, err := h.requests.GetSubmittedReferenceForCandidate(r.Context(), requestID, userID)
	if err != nil {
		switch err {
		case store.ErrSubmittedReferenceConfidential:
			response.Forbidden(w, "This reference is confidential.")
		case store.ErrSubmittedReferenceNotFound:
			response.NotFound(w, "REFERENCE_NOT_FOUND", "Submitted reference not found.")
		default:
			response.InternalError(w)
		}
		return
	}
	output, err := h.storage.Read(r.Context(), item.StorageKey)
	if err != nil {
		response.InternalError(w)
		return
	}
	w.Header().Set("Content-Type", item.ContentType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", item.SafeFilename))
	_, _ = w.Write(output.Body)
}
