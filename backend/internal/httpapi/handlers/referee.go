package handlers

import (
	"fmt"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rowjay007/referee-request/backend/internal/config"
	"github.com/rowjay007/referee-request/backend/internal/httpapi/response"
	"github.com/rowjay007/referee-request/backend/internal/security"
	"github.com/rowjay007/referee-request/backend/internal/storage"
	"github.com/rowjay007/referee-request/backend/internal/store"
	"net/http"
	"strings"
	"time"
)

type RefereeHandler struct {
	cfg      *config.Config
	requests *store.ReferenceRequestStore
	storage  storage.Store
}

type refereeDecisionPayload struct {
	Decision string `json:"decision"`
}

func NewRefereeHandler(cfg *config.Config, requests *store.ReferenceRequestStore, storage storage.Store) *RefereeHandler {
	return &RefereeHandler{
		cfg:      cfg,
		requests: requests,
		storage:  storage,
	}
}

func (h *RefereeHandler) GetRequest(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		response.ValidationError(w, map[string]any{"token": "Token is required."})
		return
	}

	tokenHash := security.HashRefereeToken(token)
	view, err := h.requests.GetRefereeRequestByTokenHash(r.Context(), tokenHash)
	if err != nil {
		if err == store.ErrRefereeInvitationNotFound {
			response.NotFound(w, "REFEREE_REQUEST_NOT_FOUND", "This referee link is invalid.")
			return
		}
		response.InternalError(w)
		return
	}

	if view.RevokedAt != nil {
		response.Forbidden(w, "This referee link has been revoked.")
		return
	}
	if time.Now().UTC().After(view.ExpiresAt) {
		response.JSON(w, http.StatusGone, response.Envelope{
			Error: &response.APIError{
				Code:    "REFEREE_LINK_EXPIRED",
				Message: "This referee link has expired.",
			},
		})
		return
	}

	if err := h.requests.MarkRefereeInvitationOpened(r.Context(), view.InvitationID, view.ReferenceRequestID); err != nil {
		response.InternalError(w)
		return
	}

	documents, err := h.requests.ListSupportingDocumentsByTokenHash(r.Context(), tokenHash)
	if err != nil {
		response.InternalError(w)
		return
	}

	documentItems := make([]map[string]any, 0, len(documents))
	for _, document := range documents {
		documentItems = append(documentItems, map[string]any{
			"id":           document.ID.String(),
			"name":         document.SafeFilename,
			"contentType":  document.ContentType,
			"sizeBytes":    document.SizeBytes,
			"downloadPath": fmt.Sprintf("/api/v1/referee/%s/documents/%s", token, document.ID.String()),
		})
	}

	response.JSON(w, http.StatusOK, response.Envelope{
		Data: map[string]any{
			"request": map[string]any{
				"candidateName":       view.CandidateName,
				"candidateEmail":      view.CandidateEmail,
				"refereeName":         view.RefereeName,
				"refereeEmail":        view.RefereeEmail,
				"refereeRelationship": view.RefereeRelationship,
				"institutionName":     view.InstitutionName,
				"programmeName":       view.ProgrammeName,
				"opportunityType":     view.OpportunityType,
				"deadlineAt":          view.DeadlineAt.UTC().Format(time.RFC3339),
				"instructions":        view.Instructions,
				"status":              view.Status,
				"decision":            view.Decision,
				"decidedAt":           toOptionalRFC3339(view.DecidedAt),
				"submittedAt":         toOptionalRFC3339(view.SubmittedAt),
				"documents":           documentItems,
			},
		},
	})
}

func (h *RefereeHandler) Decide(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		response.ValidationError(w, map[string]any{"token": "Token is required."})
		return
	}

	payload := refereeDecisionPayload{}
	if err := decodeJSONBody(r, &payload, 32*1024); err != nil {
		response.ValidationError(w, map[string]any{"body": "Invalid JSON body."})
		return
	}

	payload.Decision = strings.TrimSpace(strings.ToLower(payload.Decision))
	if payload.Decision != "accepted" && payload.Decision != "declined" {
		response.ValidationError(w, map[string]any{"decision": "Decision must be one of: accepted, declined."})
		return
	}

	tokenHash := security.HashRefereeToken(token)
	view, err := h.requests.DecideRefereeInvitationByTokenHash(r.Context(), store.RefereeDecisionInput{
		TokenHash: tokenHash,
		Decision:  payload.Decision,
	})
	if err != nil {
		switch err {
		case store.ErrRefereeInvitationNotFound:
			response.NotFound(w, "REFEREE_REQUEST_NOT_FOUND", "This referee link is invalid.")
		case store.ErrRefereeInvitationExpired:
			response.JSON(w, http.StatusGone, response.Envelope{
				Error: &response.APIError{
					Code:    "REFEREE_LINK_EXPIRED",
					Message: "This referee link has expired.",
				},
			})
		case store.ErrRefereeInvitationRevoked:
			response.Forbidden(w, "This referee link has been revoked.")
		case store.ErrRefereeAlreadySubmitted:
			response.Conflict(w, "REFERENCE_ALREADY_SUBMITTED", "A reference has already been submitted for this request.")
		case store.ErrRefereeDecisionAlreadyMade:
			response.Conflict(w, "REFEREE_DECISION_ALREADY_MADE", "A decision has already been recorded for this request.")
		default:
			response.InternalError(w)
		}
		return
	}

	response.JSON(w, http.StatusOK, response.Envelope{
		Data: map[string]any{
			"decision": map[string]any{
				"status":    view.Status,
				"decision":  view.Decision,
				"decidedAt": toOptionalRFC3339(view.DecidedAt),
			},
		},
	})
}

func (h *RefereeHandler) DownloadDocument(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	documentID, err := uuid.Parse(chi.URLParam(r, "documentId"))
	if err != nil {
		response.ValidationError(w, map[string]any{"documentId": "Document ID is invalid."})
		return
	}

	tokenHash := security.HashRefereeToken(token)
	view, err := h.requests.GetRefereeRequestByTokenHash(r.Context(), tokenHash)
	if err != nil {
		if err == store.ErrRefereeInvitationNotFound {
			response.NotFound(w, "REFEREE_REQUEST_NOT_FOUND", "This referee link is invalid.")
			return
		}
		response.InternalError(w)
		return
	}
	if view.RevokedAt != nil {
		response.Forbidden(w, "This referee link has been revoked.")
		return
	}
	if time.Now().UTC().After(view.ExpiresAt) {
		response.JSON(w, http.StatusGone, response.Envelope{
			Error: &response.APIError{
				Code:    "REFEREE_LINK_EXPIRED",
				Message: "This referee link has expired.",
			},
		})
		return
	}

	document, err := h.requests.GetSupportingDocumentByTokenHash(r.Context(), tokenHash, documentID)
	if err != nil {
		if err == store.ErrReferenceRequestNotFound {
			response.NotFound(w, "DOCUMENT_NOT_FOUND", "Supporting document not found.")
			return
		}
		response.InternalError(w)
		return
	}

	output, err := h.storage.Read(r.Context(), document.StorageKey)
	if err != nil {
		response.InternalError(w)
		return
	}

	w.Header().Set("Content-Type", document.ContentType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", document.SafeFilename))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(output.Body)
}

func (h *RefereeHandler) SubmitReference(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		response.ValidationError(w, map[string]any{"token": "Token is required."})
		return
	}

	tokenHash := security.HashRefereeToken(token)
	view, err := h.requests.GetRefereeRequestByTokenHash(r.Context(), tokenHash)
	if err != nil {
		if err == store.ErrRefereeInvitationNotFound {
			response.NotFound(w, "REFEREE_REQUEST_NOT_FOUND", "This referee link is invalid.")
			return
		}
		response.InternalError(w)
		return
	}
	if view.RevokedAt != nil {
		response.Forbidden(w, "This referee link has been revoked.")
		return
	}
	if time.Now().UTC().After(view.ExpiresAt) {
		response.JSON(w, http.StatusGone, response.Envelope{
			Error: &response.APIError{
				Code:    "REFEREE_LINK_EXPIRED",
				Message: "This referee link has expired.",
			},
		})
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, h.cfg.UploadMaxBytes)
	if err := r.ParseMultipartForm(h.cfg.UploadMaxBytes); err != nil {
		response.ValidationError(w, map[string]any{"referenceFile": "File upload exceeds allowed size or format is invalid."})
		return
	}

	file, fileHeader, err := r.FormFile("referenceFile")
	if err != nil {
		response.ValidationError(w, map[string]any{"referenceFile": "Reference file is required."})
		return
	}
	defer file.Close()

	fileBody, detectedContentType, safeFilename, extension, err := readAndValidateFile(file, fileHeader, h.cfg.UploadMaxBytes)
	if err != nil {
		response.ValidationError(w, map[string]any{"referenceFile": err.Error()})
		return
	}

	referenceID := uuid.New()
	storageKey := fmt.Sprintf("referee/%s/submitted/%s%s", view.ReferenceRequestID.String(), referenceID.String(), extension)
	if err := h.storage.Save(r.Context(), storage.SaveInput{
		Key:  storageKey,
		Body: fileBody,
	}); err != nil {
		response.InternalError(w)
		return
	}

	submitted, err := h.requests.SubmitReferenceByTokenHash(r.Context(), store.SubmitReferenceInput{
		TokenHash:        tokenHash,
		StorageKey:       storageKey,
		OriginalFilename: fileHeader.Filename,
		SafeFilename:     safeFilename,
		FileExtension:    extension,
		ContentType:      detectedContentType,
		SizeBytes:        int64(len(fileBody)),
	})
	if err != nil {
		switch err {
		case store.ErrRefereeInvitationNotFound:
			response.NotFound(w, "REFEREE_REQUEST_NOT_FOUND", "This referee link is invalid.")
		case store.ErrRefereeInvitationExpired:
			response.JSON(w, http.StatusGone, response.Envelope{
				Error: &response.APIError{
					Code:    "REFEREE_LINK_EXPIRED",
					Message: "This referee link has expired.",
				},
			})
		case store.ErrRefereeInvitationRevoked:
			response.Forbidden(w, "This referee link has been revoked.")
		case store.ErrRefereeAlreadySubmitted:
			response.Conflict(w, "REFERENCE_ALREADY_SUBMITTED", "A reference has already been submitted for this request.")
		case store.ErrRefereeDecisionRequired:
			response.Conflict(w, "REFEREE_DECISION_REQUIRED", "Please accept this request before submitting a reference.")
		default:
			response.InternalError(w)
		}
		return
	}

	response.JSON(w, http.StatusOK, response.Envelope{
		Data: map[string]any{
			"submission": map[string]any{
				"id":          submitted.ID.String(),
				"submittedAt": submitted.SubmittedAt.UTC().Format(time.RFC3339),
			},
		},
	})
}
