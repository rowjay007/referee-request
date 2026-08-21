package notification

import (
	"context"
	"log/slog"
	"time"
)

type Worker struct {
	logger            *slog.Logger
	service           *Service
	leadHours         int
	dispatchInterval  time.Duration
	reminderInterval  time.Duration
	dispatchBatchSize int
}

func NewWorker(
	logger *slog.Logger,
	service *Service,
	leadHours int,
	dispatchInterval time.Duration,
	reminderInterval time.Duration,
	dispatchBatchSize int,
) *Worker {
	return &Worker{
		logger:            logger,
		service:           service,
		leadHours:         leadHours,
		dispatchInterval:  dispatchInterval,
		reminderInterval:  reminderInterval,
		dispatchBatchSize: dispatchBatchSize,
	}
}

func (w *Worker) Run(ctx context.Context) {
	w.logger.Info(
		"notification worker started",
		"dispatch_interval", w.dispatchInterval.String(),
		"reminder_interval", w.reminderInterval.String(),
		"dispatch_batch_limit", w.dispatchBatchSize,
		"reminder_lead_hours", w.leadHours,
	)

	w.queueReminders(ctx)
	w.dispatchBatch(ctx)

	dispatchTicker := time.NewTicker(w.dispatchInterval)
	defer dispatchTicker.Stop()

	reminderTicker := time.NewTicker(w.reminderInterval)
	defer reminderTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			w.logger.Info("notification worker stopped")
			return
		case <-dispatchTicker.C:
			w.dispatchBatch(ctx)
		case <-reminderTicker.C:
			w.queueReminders(ctx)
		}
	}
}

func (w *Worker) queueReminders(ctx context.Context) {
	count, err := w.service.QueueDeadlineReminders(ctx, w.leadHours)
	if err != nil {
		w.logger.Error("notification reminder queue failed", "error", err)
		return
	}
	if count > 0 {
		w.logger.Info("notification reminders queued", "count", count)
	}
}

func (w *Worker) dispatchBatch(ctx context.Context) {
	sentCount, failedCount, err := w.service.ProcessBatch(ctx, w.dispatchBatchSize)
	if err != nil {
		w.logger.Error("notification dispatch failed", "error", err)
		return
	}
	if sentCount > 0 || failedCount > 0 {
		w.logger.Info("notification dispatch completed", "sent", sentCount, "failed", failedCount)
	}
}
