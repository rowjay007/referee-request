package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/rowjay007/referee-request/backend/internal/auth"
	"github.com/rowjay007/referee-request/backend/internal/httpapi/response"
)

type userContextKey string

const candidateContextKey userContextKey = "candidate_user_id"

func RequireCandidateAuth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := strings.TrimSpace(r.Header.Get("Authorization"))
			if !strings.HasPrefix(strings.ToLower(header), "bearer ") {
				response.Unauthorized(w, "Missing bearer token.")
				return
			}

			tokenValue := strings.TrimSpace(header[len("Bearer "):])
			if tokenValue == "" {
				response.Unauthorized(w, "Missing bearer token.")
				return
			}

			claims, err := auth.ParseToken(tokenValue, jwtSecret)
			if err != nil {
				response.Unauthorized(w, "Invalid or expired token.")
				return
			}

			ctx := context.WithValue(r.Context(), candidateContextKey, claims.UserID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func CandidateUserID(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(candidateContextKey).(uuid.UUID)
	return id, ok
}
