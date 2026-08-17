package handlers

import (
	"net/http"
	"time"

	"github.com/rowjay007/referee-request/backend/internal/httpapi/response"
)

func Health(w http.ResponseWriter, _ *http.Request) {
	response.JSON(w, http.StatusOK, response.Envelope{
		Data: map[string]any{
			"status": "ok",
			"time":   time.Now().UTC(),
		},
	})
}
