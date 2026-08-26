package store

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"time"
)

type NotificationOutboxItem struct {
	ID                 uuid.UUID
	ReferenceRequestID *uuid.UUID
	NotificationType   string
	Channel            string
	RecipientEmail     string
	RecipientName      *string
	Subject            string
	HTMLBody           string
	Status             string
	AttemptCount       int
	MaxAttempts        int
	AvailableAt        time.Time
	ProviderMessageID  *string
	LastError          *string
	SentAt             *time.Time
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

type QueueNotificationInput struct {
	ReferenceRequestID *uuid.UUID
	NotificationType   string
	RecipientEmail     string
	RecipientName      *string
	Subject            string
	HTMLBody           string
}

func (s *ReferenceRequestStore) QueueNotification(ctx context.Context, input QueueNotificationInput) error {
	_, err := s.db.Exec(
		ctx,
		`INSERT INTO notification_outbox (
		    reference_request_id, notification_type, channel, recipient_email, recipient_name, subject, html_body, status, attempt_count, max_attempts, available_at
		 ) VALUES ($1, $2, 'email', $3, $4, $5, $6, 'queued', 0, 5, NOW())`,
		input.ReferenceRequestID,
		input.NotificationType,
		input.RecipientEmail,
		input.RecipientName,
		input.Subject,
		input.HTMLBody,
	)
	return err
}

func (s *ReferenceRequestStore) ClaimNotificationBatch(ctx context.Context, limit int) ([]NotificationOutboxItem, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	rows, err := tx.Query(
		ctx,
		`WITH candidates AS (
		    SELECT id
		    FROM notification_outbox
		    WHERE status IN ('queued', 'failed')
		      AND attempt_count < max_attempts
		      AND available_at <= NOW()
		    ORDER BY created_at ASC
		    LIMIT $1
		    FOR UPDATE SKIP LOCKED
		)
		UPDATE notification_outbox n
		SET status = 'sending',
		    attempt_count = n.attempt_count + 1,
		    updated_at = NOW()
		FROM candidates
		WHERE n.id = candidates.id
		RETURNING n.id, n.reference_request_id, n.notification_type, n.channel, n.recipient_email, n.recipient_name, n.subject, n.html_body, n.status, n.attempt_count, n.max_attempts, n.available_at, n.provider_message_id, n.last_error, n.sent_at, n.created_at, n.updated_at`,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]NotificationOutboxItem, 0)
	for rows.Next() {
		item := NotificationOutboxItem{}
		err := rows.Scan(
			&item.ID,
			&item.ReferenceRequestID,
			&item.NotificationType,
			&item.Channel,
			&item.RecipientEmail,
			&item.RecipientName,
			&item.Subject,
			&item.HTMLBody,
			&item.Status,
			&item.AttemptCount,
			&item.MaxAttempts,
			&item.AvailableAt,
			&item.ProviderMessageID,
			&item.LastError,
			&item.SentAt,
			&item.CreatedAt,
			&item.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return items, nil
}

func (s *ReferenceRequestStore) MarkNotificationSent(ctx context.Context, id uuid.UUID, providerMessageID string) error {
	_, err := s.db.Exec(
		ctx,
		`UPDATE notification_outbox
		 SET status = 'sent', provider_message_id = $2, sent_at = NOW(), updated_at = NOW()
		 WHERE id = $1`,
		id,
		providerMessageID,
	)
	return err
}

func (s *ReferenceRequestStore) MarkNotificationFailed(ctx context.Context, id uuid.UUID, errMessage string) error {
	_, err := s.db.Exec(
		ctx,
		`UPDATE notification_outbox
		 SET
		     status = CASE WHEN attempt_count >= max_attempts THEN 'dead' ELSE 'failed' END,
		     available_at = CASE WHEN attempt_count >= max_attempts THEN available_at ELSE NOW() + ((LEAST(attempt_count, 6) * LEAST(attempt_count, 6)) || ' minutes')::interval END,
		     last_error = $2,
		     updated_at = NOW()
		 WHERE id = $1`,
		id,
		errMessage,
	)
	return err
}

func (s *ReferenceRequestStore) QueueDeadlineReminders(ctx context.Context, leadHours int) (int64, error) {
	result, err := s.db.Exec(
		ctx,
		`
		INSERT INTO notification_outbox (
		    reference_request_id, notification_type, channel, recipient_email, recipient_name, subject, html_body, status, attempt_count, max_attempts, available_at
		)
		SELECT
		    r.id,
		    'deadline_reminder',
		    'email',
		    r.referee_email,
		    r.referee_name,
		    ('Reminder: Reference requested by ' || u.full_name),
		    (
		      '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">' ||
		      '<h2 style="margin:0 0 12px;">Reference reminder</h2>' ||
		      '<p>Hello ' || r.referee_name || ',</p>' ||
		      '<p>This is a gentle reminder from RefereeRequest for the reference request by <strong>' || u.full_name || '</strong>.</p>' ||
		      '<p><strong>Institution/Company:</strong> ' || r.institution_name || '<br />' ||
		      '<strong>Programme/Role:</strong> ' || r.programme_name || '<br />' ||
		      '<strong>Deadline:</strong> ' || to_char(r.deadline_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI UTC') || '</p>' ||
		      '<p>You can continue using your secure link already sent to your email inbox.</p>' ||
		      '<p>Thank you.</p>' ||
		      '</div>'
		    ),
		    'queued',
		    0,
		    5,
		    NOW()
		FROM reference_requests r
		INNER JOIN users u ON u.id = r.candidate_user_id
		INNER JOIN referee_invitations ri ON ri.reference_request_id = r.id
		WHERE r.status IN ('sent', 'opened')
		  AND r.deadline_at > NOW()
		  AND r.deadline_at <= NOW() + make_interval(hours => $1::int)
		  AND ri.expires_at > NOW()
		  AND ri.revoked_at IS NULL
		  AND ri.submitted_at IS NULL
		  AND NOT EXISTS (
		      SELECT 1
		      FROM notification_outbox n
		      WHERE n.reference_request_id = r.id
		        AND n.notification_type = 'deadline_reminder'
		        AND n.created_at >= NOW() - interval '20 hours'
		  )`,
		leadHours,
	)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

func (s *ReferenceRequestStore) QueueManualReminderForCandidate(ctx context.Context, requestID, candidateUserID uuid.UUID) error {
	result, err := s.db.Exec(
		ctx,
		`
		INSERT INTO notification_outbox (
		    reference_request_id, notification_type, channel, recipient_email, recipient_name, subject, html_body, status, attempt_count, max_attempts, available_at
		)
		SELECT
		    r.id,
		    'manual_reminder',
		    'email',
		    r.referee_email,
		    r.referee_name,
		    ('Reminder: Reference requested by ' || u.full_name),
		    (
		      '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">' ||
		      '<h2 style="margin:0 0 12px;">Reference reminder</h2>' ||
		      '<p>Hello ' || r.referee_name || ',</p>' ||
		      '<p>This is a reminder from RefereeRequest for the reference request by <strong>' || u.full_name || '</strong>.</p>' ||
		      '<p><strong>Institution/Company:</strong> ' || r.institution_name || '<br />' ||
		      '<strong>Programme/Role:</strong> ' || r.programme_name || '<br />' ||
		      '<strong>Deadline:</strong> ' || to_char(r.deadline_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI UTC') || '</p>' ||
		      '<p>Please use your secure request link in your inbox to continue.</p>' ||
		      '</div>'
		    ),
		    'queued',
		    0,
		    5,
		    NOW()
		FROM reference_requests r
		INNER JOIN users u ON u.id = r.candidate_user_id
		INNER JOIN referee_invitations ri ON ri.reference_request_id = r.id
		WHERE r.id = $1
		  AND r.candidate_user_id = $2
		  AND r.status IN ('sent', 'opened', 'accepted')
		  AND r.deadline_at > NOW()
		  AND ri.expires_at > NOW()
		  AND ri.revoked_at IS NULL
		  AND ri.submitted_at IS NULL
		  AND NOT EXISTS (
		      SELECT 1
		      FROM notification_outbox n
		      WHERE n.reference_request_id = r.id
		        AND n.notification_type IN ('manual_reminder', 'deadline_reminder')
		        AND n.created_at >= NOW() - interval '6 hours'
		  )`,
		requestID,
		candidateUserID,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() > 0 {
		return nil
	}

	var status string
	err = s.db.QueryRow(
		ctx,
		`SELECT status FROM reference_requests WHERE id = $1 AND candidate_user_id = $2 LIMIT 1`,
		requestID,
		candidateUserID,
	).Scan(&status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrReferenceRequestNotFound
		}
		return err
	}

	if status != "sent" && status != "opened" && status != "accepted" {
		return ErrReferenceRequestReminderNotAllowed
	}

	var hasRecentReminder bool
	err = s.db.QueryRow(
		ctx,
		`SELECT EXISTS (
			SELECT 1
			FROM notification_outbox n
			WHERE n.reference_request_id = $1
			  AND n.notification_type IN ('manual_reminder', 'deadline_reminder')
			  AND n.created_at >= NOW() - interval '6 hours'
		)`,
		requestID,
	).Scan(&hasRecentReminder)
	if err != nil {
		return err
	}
	if hasRecentReminder {
		return ErrReferenceRequestReminderCooldown
	}

	return ErrReferenceRequestReminderNotAllowed
}

func (s *ReferenceRequestStore) QueueThankYouForCandidate(ctx context.Context, requestID, candidateUserID uuid.UUID) error {
	result, err := s.db.Exec(
		ctx,
		`
		INSERT INTO notification_outbox (
		    reference_request_id, notification_type, channel, recipient_email, recipient_name, subject, html_body, status, attempt_count, max_attempts, available_at
		)
		SELECT
		    r.id,
		    'candidate_thank_you',
		    'email',
		    r.referee_email,
		    r.referee_name,
		    ('Thank you from ' || u.full_name),
		    (
		      '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">' ||
		      '<h2 style="margin:0 0 12px;">Thank you</h2>' ||
		      '<p>Hello ' || r.referee_name || ',</p>' ||
		      '<p>' || u.full_name || ' asked us to share a thank-you note for your completed reference.</p>' ||
		      '<p><strong>Institution/Company:</strong> ' || r.institution_name || '<br />' ||
		      '<strong>Programme/Role:</strong> ' || r.programme_name || '</p>' ||
		      '<p>Thank you for your time and support.</p>' ||
		      '</div>'
		    ),
		    'queued',
		    0,
		    5,
		    NOW()
		FROM reference_requests r
		INNER JOIN users u ON u.id = r.candidate_user_id
		WHERE r.id = $1
		  AND r.candidate_user_id = $2
		  AND r.status = 'submitted'
		  AND NOT EXISTS (
		      SELECT 1
		      FROM notification_outbox n
		      WHERE n.reference_request_id = r.id
		        AND n.notification_type = 'candidate_thank_you'
		        AND n.created_at >= NOW() - interval '7 days'
		  )`,
		requestID,
		candidateUserID,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() > 0 {
		return nil
	}

	var status string
	err = s.db.QueryRow(
		ctx,
		`SELECT status FROM reference_requests WHERE id = $1 AND candidate_user_id = $2 LIMIT 1`,
		requestID,
		candidateUserID,
	).Scan(&status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrReferenceRequestNotFound
		}
		return err
	}

	if status != "submitted" {
		return ErrReferenceRequestThankYouNotAllowed
	}

	var hasRecentThankYou bool
	err = s.db.QueryRow(
		ctx,
		`SELECT EXISTS (
			SELECT 1
			FROM notification_outbox n
			WHERE n.reference_request_id = $1
			  AND n.notification_type = 'candidate_thank_you'
			  AND n.created_at >= NOW() - interval '7 days'
		)`,
		requestID,
	).Scan(&hasRecentThankYou)
	if err != nil {
		return err
	}
	if hasRecentThankYou {
		return ErrReferenceRequestThankYouCooldown
	}

	return ErrReferenceRequestThankYouNotAllowed
}
