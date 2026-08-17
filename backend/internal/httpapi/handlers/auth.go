package handlers

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"

	"github.com/rowjay007/referee-request/backend/internal/auth"
	"github.com/rowjay007/referee-request/backend/internal/config"
	"github.com/rowjay007/referee-request/backend/internal/httpapi/response"
	"github.com/rowjay007/referee-request/backend/internal/store"
)

var emailRegex = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

type AuthHandler struct {
	cfg   *config.Config
	users *store.UserStore
}

func NewAuthHandler(cfg *config.Config, users *store.UserStore) *AuthHandler {
	return &AuthHandler{cfg: cfg, users: users}
}

type signupRequest struct {
	Email    string `json:"email"`
	FullName string `json:"fullName"`
	Password string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var payload signupRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		response.ValidationError(w, map[string]any{"body": "Invalid JSON body."})
		return
	}

	payload.Email = strings.TrimSpace(strings.ToLower(payload.Email))
	payload.FullName = strings.TrimSpace(payload.FullName)
	validationErrors := validateSignup(payload)
	if len(validationErrors) > 0 {
		response.ValidationError(w, validationErrors)
		return
	}

	passwordHash, err := auth.HashPassword(payload.Password)
	if err != nil {
		response.InternalError(w)
		return
	}

	user, err := h.users.CreateUser(r.Context(), payload.Email, payload.FullName, passwordHash)
	if err != nil {
		if err == store.ErrEmailExists {
			response.Conflict(w, "EMAIL_ALREADY_EXISTS", "An account with this email already exists.")
			return
		}
		response.InternalError(w)
		return
	}

	token, err := auth.IssueToken(user.ID, user.Email, h.cfg.JWTSecret, h.cfg.JWTTTLMin)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.JSON(w, http.StatusCreated, response.Envelope{
		Data: map[string]any{
			"user": map[string]any{
				"id":       user.ID.String(),
				"email":    user.Email,
				"fullName": user.FullName,
			},
			"token": token,
		},
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var payload loginRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		response.ValidationError(w, map[string]any{"body": "Invalid JSON body."})
		return
	}

	payload.Email = strings.TrimSpace(strings.ToLower(payload.Email))
	validationErrors := validateLogin(payload)
	if len(validationErrors) > 0 {
		response.ValidationError(w, validationErrors)
		return
	}

	user, err := h.users.GetUserByEmail(r.Context(), payload.Email)
	if err != nil {
		if err == store.ErrUserNotFound {
			response.Unauthorized(w, "Invalid credentials.")
			return
		}
		response.InternalError(w)
		return
	}

	if err := auth.VerifyPassword(user.PasswordHash, payload.Password); err != nil {
		response.Unauthorized(w, "Invalid credentials.")
		return
	}

	token, err := auth.IssueToken(user.ID, user.Email, h.cfg.JWTSecret, h.cfg.JWTTTLMin)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.JSON(w, http.StatusOK, response.Envelope{
		Data: map[string]any{
			"user": map[string]any{
				"id":       user.ID.String(),
				"email":    user.Email,
				"fullName": user.FullName,
			},
			"token": token,
		},
	})
}

func validateSignup(payload signupRequest) map[string]any {
	details := map[string]any{}
	if payload.Email == "" || !emailRegex.MatchString(payload.Email) {
		details["email"] = "Please provide a valid email address."
	}
	if payload.FullName == "" || len(payload.FullName) < 2 {
		details["fullName"] = "Full name must be at least 2 characters."
	}
	if len(payload.Password) < 8 {
		details["password"] = "Password must be at least 8 characters."
	}
	return details
}

func validateLogin(payload loginRequest) map[string]any {
	details := map[string]any{}
	if payload.Email == "" || !emailRegex.MatchString(payload.Email) {
		details["email"] = "Please provide a valid email address."
	}
	if payload.Password == "" {
		details["password"] = "Password is required."
	}
	return details
}
