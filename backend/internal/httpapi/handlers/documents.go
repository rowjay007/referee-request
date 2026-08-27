package handlers

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rowjay007/referee-request/backend/internal/config"
	httputil "github.com/rowjay007/referee-request/backend/internal/httpapi/middleware"
	"github.com/rowjay007/referee-request/backend/internal/httpapi/response"
	"github.com/rowjay007/referee-request/backend/internal/storage"
	"github.com/rowjay007/referee-request/backend/internal/store"
)

var safeFilenameRegex = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

var allowedDocumentTypes = map[string]map[string]bool{
	".pdf": {
		"application/pdf": true,
	},
	".doc": {
		"application/msword": true,
	},
	".docx": {
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
		"application/zip": true,
	},
	".txt": {
		"text/plain; charset=utf-8": true,
	},
}

type DocumentHandler struct {
	cfg      *config.Config
	requests *store.ReferenceRequestStore
	storage  storage.Store
}

func NewDocumentHandler(cfg *config.Config, requests *store.ReferenceRequestStore, storage storage.Store) *DocumentHandler {
	return &DocumentHandler{
		cfg:      cfg,
		requests: requests,
		storage:  storage,
	}
}

func (h *DocumentHandler) Upload(w http.ResponseWriter, r *http.Request) {
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

	if request.Status != "draft" {
		response.Conflict(w, "REQUEST_NOT_DRAFT", "Supporting documents can only be uploaded before sending.")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, h.cfg.UploadMaxBytes)
	if err := r.ParseMultipartForm(h.cfg.UploadMaxBytes); err != nil {
		response.ValidationError(w, map[string]any{"file": "File upload exceeds allowed size or format is invalid."})
		return
	}

	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		response.ValidationError(w, map[string]any{"file": "File is required."})
		return
	}
	defer file.Close()

	fileBody, detectedContentType, safeFilename, extension, err := readAndValidateFile(file, fileHeader, h.cfg.UploadMaxBytes)
	if err != nil {
		response.ValidationError(w, map[string]any{"file": err.Error()})
		return
	}

	documentID := uuid.New()
	storageKey := fmt.Sprintf("candidate/%s/requests/%s/documents/%s%s", userID.String(), requestID.String(), documentID.String(), extension)
	if err := h.storage.Save(r.Context(), storage.SaveInput{
		Key:         storageKey,
		Body:        fileBody,
		ContentType: detectedContentType,
	}); err != nil {
		response.InternalError(w)
		return
	}

	document, err := h.requests.CreateSupportingDocument(r.Context(), store.CreateSupportingDocumentInput{
		ReferenceRequest: requestID,
		CandidateUserID:  userID,
		StorageKey:       storageKey,
		OriginalFilename: fileHeader.Filename,
		SafeFilename:     safeFilename,
		FileExtension:    extension,
		ContentType:      detectedContentType,
		SizeBytes:        int64(len(fileBody)),
	})
	if err != nil {
		_ = h.storage.Delete(r.Context(), storageKey)
		response.InternalError(w)
		return
	}

	response.JSON(w, http.StatusCreated, response.Envelope{
		Data: map[string]any{
			"document": map[string]any{
				"id":               document.ID.String(),
				"referenceRequest": document.ReferenceRequest.String(),
				"safeFilename":     document.SafeFilename,
				"contentType":      document.ContentType,
				"sizeBytes":        document.SizeBytes,
			},
		},
	})
}

func (h *DocumentHandler) List(w http.ResponseWriter, r *http.Request) {
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

	documents, err := h.requests.ListSupportingDocuments(r.Context(), requestID, userID)
	if err != nil {
		response.InternalError(w)
		return
	}

	items := make([]map[string]any, 0, len(documents))
	for _, document := range documents {
		items = append(items, map[string]any{
			"id":               document.ID.String(),
			"referenceRequest": document.ReferenceRequest.String(),
			"safeFilename":     document.SafeFilename,
			"contentType":      document.ContentType,
			"sizeBytes":        document.SizeBytes,
			"createdAt":        document.CreatedAt,
		})
	}

	response.JSON(w, http.StatusOK, response.Envelope{
		Data: map[string]any{
			"documents": items,
		},
	})
}

func readAndValidateFile(file multipart.File, fileHeader *multipart.FileHeader, maxBytes int64) ([]byte, string, string, string, error) {
	if fileHeader.Size <= 0 {
		return nil, "", "", "", fmt.Errorf("file cannot be empty")
	}
	if fileHeader.Size > maxBytes {
		return nil, "", "", "", fmt.Errorf("file exceeds maximum allowed size")
	}

	rawFilename := strings.TrimSpace(filepath.Base(fileHeader.Filename))
	if rawFilename == "" {
		return nil, "", "", "", fmt.Errorf("filename is required")
	}

	extension := strings.ToLower(filepath.Ext(rawFilename))
	if _, ok := allowedDocumentTypes[extension]; !ok {
		return nil, "", "", "", fmt.Errorf("file type is not allowed")
	}

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return nil, "", "", "", fmt.Errorf("failed to read file")
	}
	if int64(len(fileBytes)) > maxBytes {
		return nil, "", "", "", fmt.Errorf("file exceeds maximum allowed size")
	}

	detected := http.DetectContentType(fileBytes)
	if !allowedDocumentTypes[extension][detected] {
		if extension == ".docx" && bytes.HasPrefix(fileBytes, []byte("PK")) {
			detected = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
		} else {
			return nil, "", "", "", fmt.Errorf("file content type does not match extension")
		}
	}

	base := strings.TrimSuffix(rawFilename, extension)
	base = safeFilenameRegex.ReplaceAllString(base, "_")
	base = strings.Trim(base, "._-")
	if base == "" {
		base = "document"
	}
	safeFilename := base + extension

	return fileBytes, detected, safeFilename, extension, nil
}
