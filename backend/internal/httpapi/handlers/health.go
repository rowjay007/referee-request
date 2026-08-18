package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
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

func HealthReady(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		if err := db.Ping(ctx); err != nil {
			response.JSON(w, http.StatusServiceUnavailable, response.Envelope{
				Error: &response.APIError{
					Code:    "DEPENDENCY_UNAVAILABLE",
					Message: "Database is unavailable.",
				},
			})
			return
		}

		response.JSON(w, http.StatusOK, response.Envelope{
			Data: map[string]any{
				"status": "ready",
				"time":   time.Now().UTC(),
			},
		})
	}
}
