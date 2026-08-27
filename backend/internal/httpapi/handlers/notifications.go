package handlers

import (
	"crypto/subtle"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/rowjay007/referee-request/backend/internal/config"
	"github.com/rowjay007/referee-request/backend/internal/httpapi/response"
	"github.com/rowjay007/referee-request/backend/internal/notification"
	"github.com/rowjay007/referee-request/backend/internal/store"
)

type NotificationHandler struct {
	cfg           *config.Config
	notifications *notification.Service
}

func NewNotificationHandler(cfg *config.Config, notifications *notification.Service) *NotificationHandler {
	return &NotificationHandler{
		cfg:           cfg,
		notifications: notifications,
	}
}

func (h *NotificationHandler) Delivery(w http.ResponseWriter, r *http.Request) {
	if !h.validDispatchToken(r.Header.Get("X-Dispatch-Token")) {
		response.Unauthorized(w, "Invalid dispatch token.")
		return
	}
	providerMessageID := strings.TrimSpace(chi.URLParam(r, "providerMessageId"))
	if providerMessageID == "" {
		response.ValidationError(w, map[string]any{"providerMessageId": "Provider message ID is required."})
		return
	}
	if err := h.notifications.MarkInvitationDelivered(r.Context(), providerMessageID); err != nil {
		if err == store.ErrNotificationNotFound {
			response.NotFound(w, "NOTIFICATION_NOT_FOUND", "Notification not found.")
		} else {
			response.InternalError(w)
		}
		return
	}
	response.JSON(w, http.StatusOK, response.Envelope{Data: map[string]any{"providerMessageId": providerMessageID, "delivered": true}})
}

func (h *NotificationHandler) Dispatch(w http.ResponseWriter, r *http.Request) {
	if !h.validDispatchToken(r.Header.Get("X-Dispatch-Token")) {
		response.Unauthorized(w, "Invalid dispatch token.")
		return
	}

	limit := 20
	if rawLimit := r.URL.Query().Get("limit"); rawLimit != "" {
		parsed, err := strconv.Atoi(rawLimit)
		if err != nil || parsed <= 0 || parsed > 100 {
			response.ValidationError(w, map[string]any{"limit": "Limit must be between 1 and 100."})
			return
		}
		limit = parsed
	}

	sentCount, failedCount, err := h.notifications.ProcessBatch(r.Context(), limit)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.JSON(w, http.StatusOK, response.Envelope{
		Data: map[string]any{
			"sentCount":   sentCount,
			"failedCount": failedCount,
			"limit":       limit,
		},
	})
}

func (h *NotificationHandler) QueueReminders(w http.ResponseWriter, r *http.Request) {
	if !h.validDispatchToken(r.Header.Get("X-Dispatch-Token")) {
		response.Unauthorized(w, "Invalid dispatch token.")
		return
	}

	count, err := h.notifications.QueueDeadlineReminders(r.Context(), h.cfg.ReminderLeadHours)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.JSON(w, http.StatusOK, response.Envelope{
		Data: map[string]any{
			"queuedCount": count,
			"leadHours":   h.cfg.ReminderLeadHours,
		},
	})
}

func (h *NotificationHandler) validDispatchToken(input string) bool {
	if len(input) != len(h.cfg.DispatchToken) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(input), []byte(h.cfg.DispatchToken)) == 1
}
