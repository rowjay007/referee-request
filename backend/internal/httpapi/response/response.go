package response

import (
	"encoding/json"
	"net/http"
)

type Envelope struct {
	Data  any       `json:"data,omitempty"`
	Error *APIError `json:"error,omitempty"`
}

type APIError struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Details map[string]any `json:"details,omitempty"`
}

func JSON(w http.ResponseWriter, status int, payload Envelope) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func ValidationError(w http.ResponseWriter, details map[string]any) {
	JSON(w, http.StatusBadRequest, Envelope{
		Error: &APIError{
			Code:    "VALIDATION_ERROR",
			Message: "The request payload is invalid.",
			Details: details,
		},
	})
}

func Unauthorized(w http.ResponseWriter, message string) {
	JSON(w, http.StatusUnauthorized, Envelope{
		Error: &APIError{
			Code:    "UNAUTHORIZED",
			Message: message,
		},
	})
}

func Conflict(w http.ResponseWriter, code, message string) {
	JSON(w, http.StatusConflict, Envelope{
		Error: &APIError{
			Code:    code,
			Message: message,
		},
	})
}

func InternalError(w http.ResponseWriter) {
	JSON(w, http.StatusInternalServerError, Envelope{
		Error: &APIError{
			Code:    "INTERNAL_SERVER_ERROR",
			Message: "An unexpected server error occurred.",
		},
	})
}
