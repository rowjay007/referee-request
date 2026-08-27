package store

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestNotificationActionsRecordTimelineEvents(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL is required for integration tests")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("connect to database: %v", err)
	}
	t.Cleanup(pool.Close)

	candidateID := uuid.New()
	_, err = pool.Exec(
		ctx,
		`INSERT INTO users (id, email, full_name, password_hash) VALUES ($1, $2, $3, $4)`,
		candidateID,
		candidateID.String()+"@example.com",
		"Integration Candidate",
		"not-used",
	)
	if err != nil {
		t.Fatalf("create candidate: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, candidateID)
	})

	store := NewReferenceRequestStore(pool)

	t.Run("manual reminder", func(t *testing.T) {
		requestID := createNotificationTestRequest(t, ctx, pool, candidateID, "sent")
		var invitationID uuid.UUID
		err := pool.QueryRow(
			ctx,
			`INSERT INTO referee_invitations (reference_request_id, token_hash, expires_at)
			 VALUES ($1, $2, $3)
			 RETURNING id`,
			requestID,
			uuid.NewString(),
			time.Now().UTC().Add(48*time.Hour),
		).Scan(&invitationID)
		if err != nil {
			t.Fatalf("create invitation: %v", err)
		}
		if _, err := pool.Exec(
			ctx,
			`UPDATE reference_requests SET active_invitation_id = $2 WHERE id = $1`,
			requestID,
			invitationID,
		); err != nil {
			t.Fatalf("activate invitation: %v", err)
		}

		if err := store.QueueManualReminderForCandidate(ctx, requestID, candidateID); err != nil {
			t.Fatalf("queue reminder: %v", err)
		}
		assertNotificationAndEventCount(t, ctx, pool, requestID, "manual_reminder", "manual_reminder_queued", 1)

		err = store.QueueManualReminderForCandidate(ctx, requestID, candidateID)
		if !errors.Is(err, ErrReferenceRequestReminderCooldown) {
			t.Fatalf("second reminder error: got %v, want %v", err, ErrReferenceRequestReminderCooldown)
		}
		assertNotificationAndEventCount(t, ctx, pool, requestID, "manual_reminder", "manual_reminder_queued", 1)
	})

	t.Run("thank-you", func(t *testing.T) {
		requestID := createNotificationTestRequest(t, ctx, pool, candidateID, "submitted")

		if err := store.QueueThankYouForCandidate(ctx, requestID, candidateID); err != nil {
			t.Fatalf("queue thank-you: %v", err)
		}
		assertNotificationAndEventCount(t, ctx, pool, requestID, "candidate_thank_you", "thank_you_queued", 1)

		err := store.QueueThankYouForCandidate(ctx, requestID, candidateID)
		if !errors.Is(err, ErrReferenceRequestThankYouCooldown) {
			t.Fatalf("second thank-you error: got %v, want %v", err, ErrReferenceRequestThankYouCooldown)
		}
		assertNotificationAndEventCount(t, ctx, pool, requestID, "candidate_thank_you", "thank_you_queued", 1)
	})
}

func createNotificationTestRequest(t *testing.T, ctx context.Context, pool *pgxpool.Pool, candidateID uuid.UUID, status string) uuid.UUID {
	t.Helper()

	requestID := uuid.New()
	_, err := pool.Exec(
		ctx,
		`INSERT INTO reference_requests (
			id, candidate_user_id, referee_name, referee_email, referee_relationship,
			institution_name, programme_name, opportunity_type, deadline_at, instructions, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		requestID,
		candidateID,
		"Integration Referee",
		"referee@example.com",
		"Manager",
		"Integration University",
		"Integration Programme",
		"Postgraduate",
		time.Now().UTC().Add(72*time.Hour),
		"Integration test context",
		status,
	)
	if err != nil {
		t.Fatalf("create request: %v", err)
	}
	return requestID
}

func assertNotificationAndEventCount(
	t *testing.T,
	ctx context.Context,
	pool *pgxpool.Pool,
	requestID uuid.UUID,
	notificationType string,
	eventType string,
	want int,
) {
	t.Helper()

	var notificationCount int
	err := pool.QueryRow(
		ctx,
		`SELECT COUNT(*) FROM notification_outbox WHERE reference_request_id = $1 AND notification_type = $2`,
		requestID,
		notificationType,
	).Scan(&notificationCount)
	if err != nil {
		t.Fatalf("count notifications: %v", err)
	}

	var eventCount int
	err = pool.QueryRow(
		ctx,
		`SELECT COUNT(*) FROM reference_request_events WHERE reference_request_id = $1 AND event_type = $2`,
		requestID,
		eventType,
	).Scan(&eventCount)
	if err != nil {
		t.Fatalf("count events: %v", err)
	}

	if notificationCount != want || eventCount != want {
		t.Fatalf(
			"notification/event counts: got %d/%d, want %d/%d",
			notificationCount,
			eventCount,
			want,
			want,
		)
	}
}
