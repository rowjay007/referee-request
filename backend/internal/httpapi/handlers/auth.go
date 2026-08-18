package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

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

type googleAuthRequest struct {
	AccessToken string `json:"accessToken"`
}

type supabaseUserResponse struct {
	Email        string `json:"email"`
	UserMetadata struct {
		FullName string `json:"full_name"`
		Name     string `json:"name"`
	} `json:"user_metadata"`
}

func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var payload signupRequest
	if err := decodeJSONBody(r, &payload, 64*1024); err != nil {
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
	if err := decodeJSONBody(r, &payload, 64*1024); err != nil {
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

func (h *AuthHandler) GoogleAuth(w http.ResponseWriter, r *http.Request) {
	if h.cfg.SupabaseURL == "" || h.cfg.SupabaseAnonKey == "" {
		response.JSON(w, http.StatusServiceUnavailable, response.Envelope{
			Error: &response.APIError{
				Code:    "GOOGLE_AUTH_NOT_CONFIGURED",
				Message: "Google auth is not configured.",
			},
		})
		return
	}

	var payload googleAuthRequest
	if err := decodeJSONBody(r, &payload, 64*1024); err != nil {
		response.ValidationError(w, map[string]any{"body": "Invalid JSON body."})
		return
	}

	payload.AccessToken = strings.TrimSpace(payload.AccessToken)
	if payload.AccessToken == "" {
		response.ValidationError(w, map[string]any{"accessToken": "Access token is required."})
		return
	}

	supabaseUser, err := fetchSupabaseUser(r.Context(), h.cfg.SupabaseURL, h.cfg.SupabaseAnonKey, payload.AccessToken)
	if err != nil {
		response.Unauthorized(w, "Invalid Google authentication token.")
		return
	}
	if !emailRegex.MatchString(supabaseUser.Email) {
		response.Unauthorized(w, "Could not validate user email from Google authentication.")
		return
	}

	fullName := strings.TrimSpace(supabaseUser.UserMetadata.FullName)
	if fullName == "" {
		fullName = strings.TrimSpace(supabaseUser.UserMetadata.Name)
	}
	if fullName == "" {
		fullName = strings.Split(strings.ToLower(supabaseUser.Email), "@")[0]
	}

	placeholderPasswordHash, err := auth.HashPassword(supabaseUser.Email + time.Now().UTC().Format(time.RFC3339Nano))
	if err != nil {
		response.InternalError(w)
		return
	}

	user, err := h.users.UpsertOAuthUser(r.Context(), strings.ToLower(supabaseUser.Email), fullName, placeholderPasswordHash)
	if err != nil {
		response.InternalError(w)
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

func fetchSupabaseUser(ctx context.Context, supabaseURL, supabaseAnonKey, accessToken string) (*supabaseUserResponse, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(supabaseURL, "/")+"/auth/v1/user", nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Authorization", "Bearer "+accessToken)
	request.Header.Set("apikey", supabaseAnonKey)

	client := http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return nil, fmt.Errorf("supabase user lookup failed: status=%d body=%s", res.StatusCode, strings.TrimSpace(string(body)))
	}

	var payload supabaseUserResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return nil, err
	}
	if payload.Email == "" {
		return nil, fmt.Errorf("supabase user lookup returned empty email")
	}
	return &payload, nil
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
