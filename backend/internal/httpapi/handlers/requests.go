package handlers

import (
	"encoding/json"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rowjay007/referee-request/backend/internal/config"
	httputil "github.com/rowjay007/referee-request/backend/internal/httpapi/middleware"
	"github.com/rowjay007/referee-request/backend/internal/httpapi/response"
	"github.com/rowjay007/referee-request/backend/internal/security"
	"github.com/rowjay007/referee-request/backend/internal/storage"
	"github.com/rowjay007/referee-request/backend/internal/store"
	"net/http"
	"net/mail"
	"net/url"
	"sort"
	"strings"
	"time"
)

type ReferenceRequestHandler struct {
	cfg      *config.Config
	requests *store.ReferenceRequestStore
	storage  storage.Store
}

func NewReferenceRequestHandler(cfg *config.Config, requests *store.ReferenceRequestStore, documentStorage storage.Store) *ReferenceRequestHandler {
	return &ReferenceRequestHandler{cfg: cfg, requests: requests, storage: documentStorage}
}

type createReferenceRequestPayload struct {
	RefereeName           string `json:"refereeName"`
	RefereeEmail          string `json:"refereeEmail"`
	RefereeRelationship   string `json:"refereeRelationship"`
	InstitutionName       string `json:"institutionName"`
	ProgrammeName         string `json:"programmeName"`
	OpportunityType       string `json:"opportunityType"`
	DeadlineAt            string `json:"deadlineAt"`
	Instructions          string `json:"instructions"`
	ConfidentialityMode   string `json:"confidentialityMode"`
	Organization          string `json:"organization"`
	Role                  string `json:"role"`
	CountryCode           string `json:"countryCode"`
	ApplicationType       string `json:"applicationType"`
	SubmissionMethod      string `json:"submissionMethod"`
	PreferredCompletionAt string `json:"preferredCompletionAt"`
	Timezone              string `json:"timezone"`
	CandidateContext      string `json:"candidateContext"`
	WhyApplying           string `json:"whyApplying"`
	RelationshipContext   string `json:"relationshipContext"`
	Traits                string `json:"traits"`
	Achievements          string `json:"achievements"`
}

type requestReadinessResult struct {
	Ready         bool           `json:"ready"`
	MissingFields []string       `json:"missingFields"`
	Checklist     map[string]any `json:"checklist"`
}

func (h *ReferenceRequestHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := httputil.CandidateUserID(r.Context())
	if !ok {
		response.Unauthorized(w, "Authentication required.")
		return
	}

	payload := createReferenceRequestPayload{}
	if err := decodeJSONBody(r, &payload, 128*1024); err != nil {
		response.ValidationError(w, map[string]any{"body": "Invalid JSON body."})
		return
	}

	payload.RefereeName = strings.TrimSpace(payload.RefereeName)
	payload.RefereeEmail = strings.TrimSpace(strings.ToLower(payload.RefereeEmail))
	payload.RefereeRelationship = strings.TrimSpace(payload.RefereeRelationship)
	payload.InstitutionName = strings.TrimSpace(payload.InstitutionName)
	payload.ProgrammeName = strings.TrimSpace(payload.ProgrammeName)
	payload.OpportunityType = strings.TrimSpace(payload.OpportunityType)
	payload.Instructions = strings.TrimSpace(payload.Instructions)
	normalizeRequestPayload(&payload)

	details := validateCreateReferenceRequest(payload)
	if len(details) > 0 {
		response.ValidationError(w, details)
		return
	}

	deadlineAt, err := time.Parse(time.RFC3339, payload.DeadlineAt)
	if err != nil {
		response.ValidationError(w, map[string]any{"deadlineAt": "Deadline must be an RFC3339 timestamp."})
		return
	}
	if deadlineAt.Before(time.Now().UTC()) {
		response.ValidationError(w, map[string]any{"deadlineAt": "Deadline must be in the future."})
		return
	}
	preferredCompletionAt := deadlineAt
	if payload.PreferredCompletionAt != "" {
		preferredCompletionAt, err = time.Parse(time.RFC3339, payload.PreferredCompletionAt)
		if err != nil {
			response.ValidationError(w, map[string]any{"preferredCompletionAt": "Preferred completion must be an RFC3339 timestamp."})
			return
		}
	}

	request, err := h.requests.CreateReferenceRequest(r.Context(), store.CreateReferenceRequestInput{
		CandidateUserID:       userID,
		RefereeName:           payload.RefereeName,
		RefereeEmail:          payload.RefereeEmail,
		RefereeRelationship:   payload.RefereeRelationship,
		InstitutionName:       payload.InstitutionName,
		ProgrammeName:         payload.ProgrammeName,
		OpportunityType:       payload.OpportunityType,
		DeadlineAt:            deadlineAt.UTC(),
		Instructions:          payload.Instructions,
		ConfidentialityMode:   payload.ConfidentialityMode,
		Organization:          payload.Organization,
		Role:                  payload.Role,
		CountryCode:           payload.CountryCode,
		ApplicationType:       payload.ApplicationType,
		SubmissionMethod:      payload.SubmissionMethod,
		PreferredCompletionAt: &preferredCompletionAt,
		Timezone:              payload.Timezone,
		CandidateContext:      payload.CandidateContext,
		WhyApplying:           payload.WhyApplying,
		RelationshipContext:   payload.RelationshipContext,
		Traits:                payload.Traits,
		Achievements:          payload.Achievements,
	})
	if err != nil {
		response.InternalError(w)
		return
	}

	response.JSON(w, http.StatusCreated, response.Envelope{
		Data: map[string]any{
			"request": requestToPayload(*request),
		},
	})
}

func (h *ReferenceRequestHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := httputil.CandidateUserID(r.Context())
	if !ok {
		response.Unauthorized(w, "Authentication required.")
		return
	}

	requests, err := h.requests.ListReferenceRequestsByCandidate(r.Context(), userID)
	if err != nil {
		response.InternalError(w)
		return
	}

	items := make([]map[string]any, 0, len(requests))
	for _, request := range requests {
		items = append(items, requestToPayload(request))
	}

	response.JSON(w, http.StatusOK, response.Envelope{
		Data: map[string]any{
			"requests": items,
		},
	})
}

func (h *ReferenceRequestHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := httputil.CandidateUserID(r.Context())
	if !ok {
		response.Unauthorized(w, "Authentication required.")
		return
	}

	requestID, err := uuid.Parse(chi.URLParam(r, "requestId"))
	if err != nil {
		response.ValidationError(w, map[string]any{"requestId": "Request ID is invalid."})
		return
	}

	request, err := h.requests.GetReferenceRequestByIDForCandidate(r.Context(), requestID, userID)
	if err != nil {
		if err == store.ErrReferenceRequestNotFound {
			response.NotFound(w, "REQUEST_NOT_FOUND", "Reference request not found.")
			return
		}
		response.InternalError(w)
		return
	}

	response.JSON(w, http.StatusOK, response.Envelope{
		Data: map[string]any{
			"request": requestToPayload(*request),
		},
	})
}

func (h *ReferenceRequestHandler) Readiness(w http.ResponseWriter, r *http.Request) {
	userID, ok := httputil.CandidateUserID(r.Context())
	if !ok {
		response.Unauthorized(w, "Authentication required.")
		return
	}

	requestID, err := uuid.Parse(chi.URLParam(r, "requestId"))
	if err != nil {
		response.ValidationError(w, map[string]any{"requestId": "Request ID is invalid."})
		return
	}

	request, err := h.requests.GetReferenceRequestByIDForCandidate(r.Context(), requestID, userID)
	if err != nil {
		if err == store.ErrReferenceRequestNotFound {
			response.NotFound(w, "REQUEST_NOT_FOUND", "Reference request not found.")
			return
		}
		response.InternalError(w)
		return
	}

	documents, err := h.requests.ListSupportingDocuments(r.Context(), requestID, userID)
	if err != nil {
		response.InternalError(w)
		return
	}

	readiness := evaluateRequestReadiness(*request, len(documents), time.Now().UTC())

	response.JSON(w, http.StatusOK, response.Envelope{
		Data: map[string]any{
			"requestId": requestID.String(),
			"readiness": readiness,
		},
	})
}

func (h *ReferenceRequestHandler) Send(w http.ResponseWriter, r *http.Request) {
	userID, ok := httputil.CandidateUserID(r.Context())
	if !ok {
		response.Unauthorized(w, "Authentication required.")
		return
	}

	requestID, err := uuid.Parse(chi.URLParam(r, "requestId"))
	if err != nil {
		response.ValidationError(w, map[string]any{"requestId": "Request ID is invalid."})
		return
	}

	request, err := h.requests.GetReferenceRequestByIDForCandidate(r.Context(), requestID, userID)
	if err != nil {
		if err == store.ErrReferenceRequestNotFound {
			response.NotFound(w, "REQUEST_NOT_FOUND", "Reference request not found.")
			return
		}
		response.InternalError(w)
		return
	}

	documents, err := h.requests.ListSupportingDocuments(r.Context(), requestID, userID)
	if err != nil {
		response.InternalError(w)
		return
	}

	readiness := evaluateRequestReadiness(*request, len(documents), time.Now().UTC())
	if !readiness.Ready {
		response.ValidationError(w, map[string]any{
			"requestReadiness": "Your referee may need more context before writing a strong reference.",
			"missingFields":    readiness.MissingFields,
			"checklist":        readiness.Checklist,
		})
		return
	}

	token, err := security.GenerateRefereeToken()
	if err != nil {
		response.InternalError(w)
		return
	}

	tokenHash := security.HashRefereeToken(token)
	expiresAt := time.Now().UTC().Add(30 * 24 * time.Hour)
	refereeLink, err := url.JoinPath(h.cfg.FrontendBaseURL, "referee", token)
	if err != nil {
		response.InternalError(w)
		return
	}

	request, invitation, err := h.requests.SendReferenceRequestWithInvitation(
		r.Context(),
		requestID,
		userID,
		tokenHash,
		expiresAt,
		refereeLink,
	)
	if err != nil {
		switch err {
		case store.ErrReferenceRequestNotFound:
			response.NotFound(w, "REQUEST_NOT_FOUND", "Reference request not found.")
		case store.ErrReferenceRequestAlreadySent:
			response.Conflict(w, "REQUEST_ALREADY_SENT", "This request has already been sent.")
		default:
			response.InternalError(w)
		}
		return
	}

	response.JSON(w, http.StatusOK, response.Envelope{
		Data: map[string]any{
			"request":      requestToPayload(*request),
			"refereeLink":  refereeLink,
			"tokenExpires": invitation.ExpiresAt.UTC().Format(time.RFC3339),
		},
	})
}

func (h *ReferenceRequestHandler) Reminder(w http.ResponseWriter, r *http.Request) {
	userID, ok := httputil.CandidateUserID(r.Context())
	if !ok {
		response.Unauthorized(w, "Authentication required.")
		return
	}

	requestID, err := uuid.Parse(chi.URLParam(r, "requestId"))
	if err != nil {
		response.ValidationError(w, map[string]any{"requestId": "Request ID is invalid."})
		return
	}

	err = h.requests.QueueManualReminderForCandidate(r.Context(), requestID, userID)
	if err != nil {
		switch err {
		case store.ErrReferenceRequestNotFound:
			response.NotFound(w, "REQUEST_NOT_FOUND", "Reference request not found.")
		case store.ErrReferenceRequestReminderCooldown:
			response.Conflict(w, "REMINDER_COOLDOWN", "A reminder was sent recently. Please try again later.")
		case store.ErrReferenceRequestReminderNotAllowed:
			response.Conflict(w, "REMINDER_NOT_ALLOWED", "This request cannot receive reminders in its current state.")
		default:
			response.InternalError(w)
		}
		return
	}

	response.JSON(w, http.StatusOK, response.Envelope{
		Data: map[string]any{
			"requestId": requestID.String(),
			"queued":    true,
		},
	})
}

func (h *ReferenceRequestHandler) ThankYou(w http.ResponseWriter, r *http.Request) {
	userID, ok := httputil.CandidateUserID(r.Context())
	if !ok {
		response.Unauthorized(w, "Authentication required.")
		return
	}

	requestID, err := uuid.Parse(chi.URLParam(r, "requestId"))
	if err != nil {
		response.ValidationError(w, map[string]any{"requestId": "Request ID is invalid."})
		return
	}

	err = h.requests.QueueThankYouForCandidate(r.Context(), requestID, userID)
	if err != nil {
		switch err {
		case store.ErrReferenceRequestNotFound:
			response.NotFound(w, "REQUEST_NOT_FOUND", "Reference request not found.")
		case store.ErrReferenceRequestThankYouCooldown:
			response.Conflict(w, "THANK_YOU_COOLDOWN", "A thank-you note was sent recently. Please try again later.")
		case store.ErrReferenceRequestThankYouNotAllowed:
			response.Conflict(w, "THANK_YOU_NOT_ALLOWED", "This request is not eligible for a thank-you note yet.")
		default:
			response.InternalError(w)
		}
		return
	}

	response.JSON(w, http.StatusOK, response.Envelope{
		Data: map[string]any{
			"requestId": requestID.String(),
			"queued":    true,
		},
	})
}

func (h *ReferenceRequestHandler) Events(w http.ResponseWriter, r *http.Request) {
	userID, ok := httputil.CandidateUserID(r.Context())
	if !ok {
		response.Unauthorized(w, "Authentication required.")
		return
	}

	requestID, err := uuid.Parse(chi.URLParam(r, "requestId"))
	if err != nil {
		response.ValidationError(w, map[string]any{"requestId": "Request ID is invalid."})
		return
	}

	events, err := h.requests.ListReferenceRequestEvents(r.Context(), requestID, userID)
	if err != nil {
		response.InternalError(w)
		return
	}

	items := make([]map[string]any, 0, len(events))
	for _, event := range events {
		metadata := json.RawMessage(event.Metadata)
		items = append(items, map[string]any{
			"id":               event.ID.String(),
			"referenceRequest": event.ReferenceRequest.String(),
			"eventType":        event.EventType,
			"actorUserId":      uuidPtrToString(event.ActorUserID),
			"metadata":         metadata,
			"createdAt":        event.CreatedAt.UTC().Format(time.RFC3339),
		})
	}

	response.JSON(w, http.StatusOK, response.Envelope{
		Data: map[string]any{
			"events": items,
		},
	})
}

func evaluateRequestReadiness(request store.ReferenceRequest, documentsCount int, now time.Time) requestReadinessResult {
	checklist := map[string]bool{
		"refereeInformation":    strings.TrimSpace(request.RefereeName) != "" && strings.TrimSpace(request.RefereeEmail) != "" && strings.TrimSpace(request.RefereeRelationship) != "",
		"applicationPurpose":    strings.TrimSpace(request.InstitutionName) != "" && strings.TrimSpace(request.ProgrammeName) != "" && strings.TrimSpace(request.OpportunityType) != "",
		"deadline":              request.DeadlineAt.After(now),
		"candidateContext":      strings.TrimSpace(request.Instructions) != "",
		"supportingInformation": documentsCount > 0,
	}

	missing := make([]string, 0)
	for key, ok := range checklist {
		if !ok {
			missing = append(missing, key)
		}
	}
	sort.Strings(missing)

	return requestReadinessResult{
		Ready:         len(missing) == 0,
		MissingFields: missing,
		Checklist: map[string]any{
			"refereeInformation":    checklist["refereeInformation"],
			"applicationPurpose":    checklist["applicationPurpose"],
			"deadline":              checklist["deadline"],
			"candidateContext":      checklist["candidateContext"],
			"supportingInformation": checklist["supportingInformation"],
		},
	}
}

func validateCreateReferenceRequest(payload createReferenceRequestPayload) map[string]any {
	details := map[string]any{}
	if payload.RefereeName == "" {
		details["refereeName"] = "Referee name is required."
	}
	if payload.RefereeEmail == "" {
		details["refereeEmail"] = "Referee email is required."
	} else if _, err := mail.ParseAddress(payload.RefereeEmail); err != nil {
		details["refereeEmail"] = "Referee email is invalid."
	}
	if payload.RefereeRelationship == "" {
		details["refereeRelationship"] = "Referee relationship is required."
	}
	if payload.InstitutionName == "" {
		details["institutionName"] = "Institution or company name is required."
	}
	if payload.ProgrammeName == "" {
		details["programmeName"] = "Programme or role is required."
	}
	if payload.OpportunityType == "" {
		details["opportunityType"] = "Opportunity type is required."
	}
	if payload.DeadlineAt == "" {
		details["deadlineAt"] = "Deadline is required."
	}
	if len(payload.Instructions) > 5000 {
		details["instructions"] = "Instructions must be 5000 characters or fewer."
	}
	if payload.ConfidentialityMode != "confidential" && payload.ConfidentialityMode != "non_confidential" {
		details["confidentialityMode"] = "Confidentiality mode must be confidential or non_confidential."
	}
	if payload.CountryCode != "" && len(payload.CountryCode) != 2 {
		details["countryCode"] = "Country code must be a two-letter code."
	}
	if _, err := time.LoadLocation(payload.Timezone); err != nil {
		details["timezone"] = "Timezone must be a valid IANA timezone."
	}
	return details
}

func normalizeRequestPayload(payload *createReferenceRequestPayload) {
	payload.Organization = strings.TrimSpace(payload.Organization)
	payload.Role = strings.TrimSpace(payload.Role)
	payload.CountryCode = strings.ToUpper(strings.TrimSpace(payload.CountryCode))
	payload.ApplicationType = strings.TrimSpace(payload.ApplicationType)
	payload.SubmissionMethod = strings.TrimSpace(payload.SubmissionMethod)
	payload.Timezone = strings.TrimSpace(payload.Timezone)
	payload.CandidateContext = strings.TrimSpace(payload.CandidateContext)
	payload.WhyApplying = strings.TrimSpace(payload.WhyApplying)
	payload.RelationshipContext = strings.TrimSpace(payload.RelationshipContext)
	payload.Traits = strings.TrimSpace(payload.Traits)
	payload.Achievements = strings.TrimSpace(payload.Achievements)
	payload.ConfidentialityMode = strings.TrimSpace(strings.ToLower(payload.ConfidentialityMode))
	if payload.ConfidentialityMode == "" {
		payload.ConfidentialityMode = "confidential"
	}
	if payload.Organization == "" {
		payload.Organization = payload.InstitutionName
	}
	if payload.InstitutionName == "" {
		payload.InstitutionName = payload.Organization
	}
	if payload.Role == "" {
		payload.Role = payload.ProgrammeName
	}
	if payload.ProgrammeName == "" {
		payload.ProgrammeName = payload.Role
	}
	if payload.ApplicationType == "" {
		payload.ApplicationType = payload.OpportunityType
	}
	if payload.OpportunityType == "" {
		payload.OpportunityType = payload.ApplicationType
	}
	if payload.CandidateContext == "" {
		payload.CandidateContext = payload.Instructions
	}
	if payload.Instructions == "" {
		payload.Instructions = payload.CandidateContext
	}
	if payload.RelationshipContext == "" {
		payload.RelationshipContext = payload.RefereeRelationship
	}
	if payload.Timezone == "" {
		payload.Timezone = "UTC"
	}
	if payload.PreferredCompletionAt == "" {
		payload.PreferredCompletionAt = payload.DeadlineAt
	}
	if payload.DeadlineAt == "" {
		payload.DeadlineAt = payload.PreferredCompletionAt
	}
}

func requestToPayload(request store.ReferenceRequest) map[string]any {
	return map[string]any{
		"id":                    request.ID.String(),
		"refereeName":           request.RefereeName,
		"refereeEmail":          request.RefereeEmail,
		"refereeRelationship":   request.RefereeRelationship,
		"institutionName":       request.InstitutionName,
		"programmeName":         request.ProgrammeName,
		"opportunityType":       request.OpportunityType,
		"deadlineAt":            request.DeadlineAt.UTC().Format(time.RFC3339),
		"instructions":          request.Instructions,
		"confidentialityMode":   request.ConfidentialityMode,
		"organization":          request.Organization,
		"role":                  request.Role,
		"countryCode":           request.CountryCode,
		"applicationType":       request.ApplicationType,
		"submissionMethod":      request.SubmissionMethod,
		"preferredCompletionAt": toOptionalRFC3339(request.PreferredCompletionAt),
		"timezone":              request.Timezone,
		"candidateContext":      request.CandidateContext,
		"whyApplying":           request.WhyApplying,
		"relationshipContext":   request.RelationshipContext,
		"traits":                request.Traits,
		"achievements":          request.Achievements,
		"outcome":               request.Outcome,
		"outcomeNote":           request.OutcomeNote,
		"outcomeAt":             toOptionalRFC3339(request.OutcomeAt),
		"status":                request.Status,
		"sentAt":                toOptionalRFC3339(request.SentAt),
		"openedAt":              toOptionalRFC3339(request.OpenedAt),
		"submittedAt":           toOptionalRFC3339(request.SubmittedAt),
		"createdAt":             request.CreatedAt.UTC().Format(time.RFC3339),
		"updatedAt":             request.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func toOptionalRFC3339(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.UTC().Format(time.RFC3339)
	return &formatted
}

func uuidPtrToString(id *uuid.UUID) *string {
	if id == nil {
		return nil
	}
	value := id.String()
	return &value
}
