package handlers

import (
	"encoding/json"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	httputil "github.com/rowjay007/referee-request/backend/internal/httpapi/middleware"
	"github.com/rowjay007/referee-request/backend/internal/httpapi/response"
	"github.com/rowjay007/referee-request/backend/internal/store"
)

type ReferenceRequestHandler struct {
	requests *store.ReferenceRequestStore
}

func NewReferenceRequestHandler(requests *store.ReferenceRequestStore) *ReferenceRequestHandler {
	return &ReferenceRequestHandler{requests: requests}
}

type createReferenceRequestPayload struct {
	RefereeName         string `json:"refereeName"`
	RefereeEmail        string `json:"refereeEmail"`
	RefereeRelationship string `json:"refereeRelationship"`
	InstitutionName     string `json:"institutionName"`
	ProgrammeName       string `json:"programmeName"`
	OpportunityType     string `json:"opportunityType"`
	DeadlineAt          string `json:"deadlineAt"`
	Instructions        string `json:"instructions"`
}

func (h *ReferenceRequestHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := httputil.CandidateUserID(r.Context())
	if !ok {
		response.Unauthorized(w, "Authentication required.")
		return
	}

	payload := createReferenceRequestPayload{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
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

	request, err := h.requests.CreateReferenceRequest(r.Context(), store.CreateReferenceRequestInput{
		CandidateUserID:     userID,
		RefereeName:         payload.RefereeName,
		RefereeEmail:        payload.RefereeEmail,
		RefereeRelationship: payload.RefereeRelationship,
		InstitutionName:     payload.InstitutionName,
		ProgrammeName:       payload.ProgrammeName,
		OpportunityType:     payload.OpportunityType,
		DeadlineAt:          deadlineAt.UTC(),
		Instructions:        payload.Instructions,
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

	request, err := h.requests.MarkReferenceRequestSent(r.Context(), requestID, userID)
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
			"request": requestToPayload(*request),
		},
	})
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
	return details
}

func requestToPayload(request store.ReferenceRequest) map[string]any {
	return map[string]any{
		"id":                  request.ID.String(),
		"refereeName":         request.RefereeName,
		"refereeEmail":        request.RefereeEmail,
		"refereeRelationship": request.RefereeRelationship,
		"institutionName":     request.InstitutionName,
		"programmeName":       request.ProgrammeName,
		"opportunityType":     request.OpportunityType,
		"deadlineAt":          request.DeadlineAt.UTC().Format(time.RFC3339),
		"instructions":        request.Instructions,
		"status":              request.Status,
		"sentAt":              toOptionalRFC3339(request.SentAt),
		"openedAt":            toOptionalRFC3339(request.OpenedAt),
		"submittedAt":         toOptionalRFC3339(request.SubmittedAt),
		"createdAt":           request.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func toOptionalRFC3339(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.UTC().Format(time.RFC3339)
	return &formatted
}
