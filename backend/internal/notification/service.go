package notification

import (
	"context"
	"errors"
	"log/slog"

	"github.com/rowjay007/referee-request/backend/internal/store"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/metric"
)

type Service struct {
	logger        *slog.Logger
	store         *store.ReferenceRequestStore
	sender        Sender
	fromEmail     string
	sentCounter   metric.Int64Counter
	failedCounter metric.Int64Counter
}

func NewService(
	logger *slog.Logger,
	store *store.ReferenceRequestStore,
	sender Sender,
	fromEmail string,
) (*Service, error) {
	meter := otel.GetMeterProvider().Meter("referee-request-api.notifications")
	sentCounter, err := meter.Int64Counter("notification.email.sent")
	if err != nil {
		return nil, err
	}
	failedCounter, err := meter.Int64Counter("notification.email.failed")
	if err != nil {
		return nil, err
	}

	return &Service{
		logger:        logger,
		store:         store,
		sender:        sender,
		fromEmail:     fromEmail,
		sentCounter:   sentCounter,
		failedCounter: failedCounter,
	}, nil
}

func (s *Service) ProcessBatch(ctx context.Context, limit int) (int, int, error) {
	if limit <= 0 {
		return 0, 0, errors.New("limit must be greater than zero")
	}

	items, err := s.store.ClaimNotificationBatch(ctx, limit)
	if err != nil {
		return 0, 0, err
	}

	sentCount := 0
	failedCount := 0

	for _, item := range items {
		providerID, sendErr := s.sender.SendEmail(ctx, EmailMessage{
			From:    s.fromEmail,
			To:      item.RecipientEmail,
			Subject: item.Subject,
			HTML:    item.HTMLBody,
		})
		if sendErr != nil {
			failedCount++
			s.failedCounter.Add(ctx, 1)
			markErr := s.store.MarkNotificationFailed(ctx, item.ID, sendErr.Error())
			if markErr != nil {
				return sentCount, failedCount, markErr
			}
			s.logger.Error(
				"notification send failed",
				"notification_id", item.ID.String(),
				"type", item.NotificationType,
				"error", sendErr,
			)
			continue
		}

		sentCount++
		s.sentCounter.Add(ctx, 1)
		markErr := s.store.MarkNotificationSent(ctx, item.ID, providerID)
		if markErr != nil {
			return sentCount, failedCount, markErr
		}
	}

	return sentCount, failedCount, nil
}

func (s *Service) QueueDeadlineReminders(ctx context.Context, leadHours int) (int64, error) {
	return s.store.QueueDeadlineReminders(ctx, leadHours)
}
