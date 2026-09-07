package handlers

import (
	"net/http"

	httputil "github.com/rowjay007/referee-request/backend/internal/httpapi/middleware"
	"github.com/rowjay007/referee-request/backend/internal/httpapi/response"
	"github.com/rowjay007/referee-request/backend/internal/storage"
	"github.com/rowjay007/referee-request/backend/internal/store"
)

type AccountHandler struct {
	users   *store.UserStore
	storage storage.Store
}

func NewAccountHandler(users *store.UserStore, documentStorage storage.Store) *AccountHandler {
	return &AccountHandler{users: users, storage: documentStorage}
}

func (h *AccountHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := httputil.CandidateUserID(r.Context())
	if !ok {
		response.Unauthorized(w, "Authentication required.")
		return
	}

	keys, err := h.users.DeleteUser(r.Context(), userID)
	if err != nil {
		if err == store.ErrUserNotFound {
			response.NotFound(w, "USER_NOT_FOUND", "Account not found.")
			return
		}
		response.InternalError(w)
		return
	}

	for _, key := range keys {
		if err := h.storage.Delete(r.Context(), key); err != nil {
			response.InternalError(w)
			return
		}
	}

	response.JSON(w, http.StatusOK, response.Envelope{Data: map[string]any{"deleted": true}})
}
