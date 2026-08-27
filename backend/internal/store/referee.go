package store

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"time"
)

var ErrRefereeInvitationNotFound = errors.New("referee invitation not found")
var ErrRefereeInvitationExpired = errors.New("referee invitation expired")
var ErrRefereeInvitationRevoked = errors.New("referee invitation revoked")
var ErrRefereeAlreadySubmitted = errors.New("reference already submitted")
var ErrRefereeDecisionAlreadyMade = errors.New("referee decision already made")
var ErrRefereeDecisionRequired = errors.New("referee decision required before submission")

type RefereeInvitation struct {
	ID                  uuid.UUID
	ReferenceRequestID  uuid.UUID
	TokenHash           string
	ExpiresAt           time.Time
	RevokedAt           *time.Time
	OpenedAt            *time.Time
	Decision            *string
	DecidedAt           *time.Time
	SubmittedAt         *time.Time
	RefereeName         string
	RefereeEmail        string
	RefereeRelationship string
	DeliveredAt         *time.Time
	InProgressAt        *time.Time
	SupersededAt        *time.Time
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

type RefereeRequestView struct {
	InvitationID          uuid.UUID
	ReferenceRequestID    uuid.UUID
	CandidateUserID       uuid.UUID
	CandidateName         string
	CandidateEmail        string
	RefereeName           string
	RefereeEmail          string
	RefereeRelationship   string
	InstitutionName       string
	ProgrammeName         string
	OpportunityType       string
	DeadlineAt            time.Time
	Instructions          string
	Status                string
	ExpiresAt             time.Time
	RevokedAt             *time.Time
	OpenedAt              *time.Time
	Decision              *string
	DecidedAt             *time.Time
	SubmittedAt           *time.Time
	DeliveredAt           *time.Time
	InProgressAt          *time.Time
	SupersededAt          *time.Time
	ConfidentialityMode   string
	Organization          string
	Role                  string
	CountryCode           string
	ApplicationType       string
	SubmissionMethod      string
	PreferredCompletionAt *time.Time
	Timezone              string
	CandidateContext      string
	WhyApplying           string
	RelationshipContext   string
	Traits                string
	Achievements          string
}

type RefereeDecisionInput struct {
	TokenHash string
	Decision  string
}

type SubmitReferenceInput struct {
	TokenHash        string
	StorageKey       string
	OriginalFilename string
	SafeFilename     string
	FileExtension    string
	ContentType      string
	SizeBytes        int64
}

type SubmittedReference struct {
	ID               uuid.UUID
	ReferenceRequest uuid.UUID
	InvitationID     uuid.UUID
	StorageKey       string
	OriginalFilename string
	SafeFilename     string
	FileExtension    string
	ContentType      string
	SizeBytes        int64
	SubmittedAt      time.Time
}

func (s *ReferenceRequestStore) SendReferenceRequestWithInvitation(
	ctx context.Context,
	requestID uuid.UUID,
	candidateUserID uuid.UUID,
	tokenHash string,
	expiresAt time.Time,
	refereeLink string,
) (*ReferenceRequest, *RefereeInvitation, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	request, err := scanReferenceRequest(tx.QueryRow(
		ctx,
		`UPDATE reference_requests
		 SET status = 'sent', sent_at = NOW(), updated_at = NOW()
		 WHERE id = $1 AND candidate_user_id = $2 AND status = 'draft'
		 RETURNING `+referenceRequestColumns,
		requestID,
		candidateUserID,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		var existingStatus string
		statusErr := tx.QueryRow(
			ctx,
			`SELECT status FROM reference_requests WHERE id = $1 AND candidate_user_id = $2 LIMIT 1`,
			requestID,
			candidateUserID,
		).Scan(&existingStatus)
		if errors.Is(statusErr, pgx.ErrNoRows) {
			return nil, nil, ErrReferenceRequestNotFound
		}
		if statusErr != nil {
			return nil, nil, statusErr
		}
		return nil, nil, ErrReferenceRequestAlreadySent
	}
	if err != nil {
		return nil, nil, err
	}

	invitation := &RefereeInvitation{}
	insertErr := tx.QueryRow(
		ctx,
		`INSERT INTO referee_invitations (reference_request_id, token_hash, expires_at, referee_name, referee_email, referee_relationship)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, reference_request_id, token_hash, expires_at, revoked_at, opened_at, decision, decided_at, submitted_at, created_at, updated_at,
		 referee_name, referee_email, referee_relationship, delivered_at, in_progress_at, superseded_at`,
		requestID,
		tokenHash,
		expiresAt,
		request.RefereeName,
		request.RefereeEmail,
		request.RefereeRelationship,
	).Scan(
		&invitation.ID,
		&invitation.ReferenceRequestID,
		&invitation.TokenHash,
		&invitation.ExpiresAt,
		&invitation.RevokedAt,
		&invitation.OpenedAt,
		&invitation.Decision,
		&invitation.DecidedAt,
		&invitation.SubmittedAt,
		&invitation.CreatedAt,
		&invitation.UpdatedAt,
		&invitation.RefereeName,
		&invitation.RefereeEmail,
		&invitation.RefereeRelationship,
		&invitation.DeliveredAt,
		&invitation.InProgressAt,
		&invitation.SupersededAt,
	)
	if insertErr != nil {
		return nil, nil, insertErr
	}
	_, err = tx.Exec(ctx, `UPDATE reference_requests SET active_invitation_id=$2 WHERE id=$1`, requestID, invitation.ID)
	if err != nil {
		return nil, nil, err
	}

	_, eventErr := tx.Exec(
		ctx,
		`INSERT INTO reference_request_events (reference_request_id, event_type, actor_user_id, metadata)
		 VALUES ($1, 'request_sent', $2, jsonb_build_object('invitation_id', $3::text))`,
		requestID,
		candidateUserID,
		invitation.ID,
	)
	if eventErr != nil {
		return nil, nil, eventErr
	}

	var candidateName string
	candidateErr := tx.QueryRow(
		ctx,
		`SELECT full_name FROM users WHERE id = $1 LIMIT 1`,
		candidateUserID,
	).Scan(&candidateName)
	if candidateErr != nil {
		return nil, nil, candidateErr
	}

	subject := "Reference request from " + candidateName
	htmlBody := "<div style=\"font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;\">" +
		"<h2 style=\"margin:0 0 12px;\">Reference request invitation</h2>" +
		"<p>Hello " + request.RefereeName + ",</p>" +
		"<p>" + candidateName + " is requesting your reference.</p>" +
		"<p><strong>Institution/Company:</strong> " + request.InstitutionName + "<br />" +
		"<strong>Programme/Role:</strong> " + request.ProgrammeName + "<br />" +
		"<strong>Deadline:</strong> " + request.DeadlineAt.UTC().Format("2006-01-02 15:04 UTC") + "</p>" +
		"<p>Please use this secure link to complete the request:</p>" +
		"<p><a href=\"" + refereeLink + "\">" + refereeLink + "</a></p>" +
		"<p>Thank you.</p>" +
		"</div>"

	_, queueErr := tx.Exec(
		ctx,
		`INSERT INTO notification_outbox (
		    reference_request_id, referee_invitation_id, notification_type, channel, recipient_email, recipient_name, subject, html_body, status, attempt_count, max_attempts, available_at
		 ) VALUES ($1, $2, 'invitation_email', 'email', $3, $4, $5, $6, 'queued', 0, 5, NOW())`,
		request.ID,
		invitation.ID,
		request.RefereeEmail,
		request.RefereeName,
		subject,
		htmlBody,
	)
	if queueErr != nil {
		return nil, nil, queueErr
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}
	return request, invitation, nil
}

func (s *ReferenceRequestStore) GetRefereeRequestByTokenHash(ctx context.Context, tokenHash string) (*RefereeRequestView, error) {
	const query = `
		SELECT
			ri.id,
			r.id,
			r.candidate_user_id,
			u.full_name,
			u.email,
			ri.referee_name,
			ri.referee_email,
			ri.referee_relationship,
			r.institution_name,
			r.programme_name,
			r.opportunity_type,
			r.deadline_at,
			r.instructions,
			r.status,
			ri.expires_at,
			ri.revoked_at,
			ri.opened_at,
			ri.decision,
			ri.decided_at,
			ri.submitted_at,
			ri.delivered_at,
			ri.in_progress_at,
			ri.superseded_at,
			r.confidentiality_mode, r.organization, r.role, r.country_code, r.application_type,
			r.submission_method, r.preferred_completion_at, r.timezone, r.candidate_context,
			r.why_applying, r.relationship_context, r.traits, r.achievements
		FROM referee_invitations ri
		INNER JOIN reference_requests r ON r.id = ri.reference_request_id
		INNER JOIN users u ON u.id = r.candidate_user_id
		WHERE ri.token_hash = $1
		LIMIT 1
	`

	view := &RefereeRequestView{}
	err := s.db.QueryRow(ctx, query, tokenHash).Scan(
		&view.InvitationID,
		&view.ReferenceRequestID,
		&view.CandidateUserID,
		&view.CandidateName,
		&view.CandidateEmail,
		&view.RefereeName,
		&view.RefereeEmail,
		&view.RefereeRelationship,
		&view.InstitutionName,
		&view.ProgrammeName,
		&view.OpportunityType,
		&view.DeadlineAt,
		&view.Instructions,
		&view.Status,
		&view.ExpiresAt,
		&view.RevokedAt,
		&view.OpenedAt,
		&view.Decision,
		&view.DecidedAt,
		&view.SubmittedAt,
		&view.DeliveredAt,
		&view.InProgressAt,
		&view.SupersededAt,
		&view.ConfidentialityMode,
		&view.Organization,
		&view.Role,
		&view.CountryCode,
		&view.ApplicationType,
		&view.SubmissionMethod,
		&view.PreferredCompletionAt,
		&view.Timezone,
		&view.CandidateContext,
		&view.WhyApplying,
		&view.RelationshipContext,
		&view.Traits,
		&view.Achievements,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrRefereeInvitationNotFound
	}
	if err != nil {
		return nil, err
	}
	return view, nil
}

func (s *ReferenceRequestStore) MarkRefereeInvitationOpened(ctx context.Context, invitationID, requestID uuid.UUID) error {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(
		ctx,
		`UPDATE referee_invitations
		 SET opened_at = COALESCE(opened_at, NOW()), updated_at = NOW()
		 WHERE id = $1`,
		invitationID,
	)
	if err != nil {
		return err
	}

	_, err = tx.Exec(
		ctx,
		`UPDATE reference_requests
		 SET opened_at = COALESCE(opened_at, NOW()),
		     status = CASE WHEN status IN ('sent', 'delivered') THEN 'opened' ELSE status END,
		     updated_at = NOW()
		 WHERE id = $1 AND active_invitation_id = $2`,
		requestID,
		invitationID,
	)
	if err != nil {
		return err
	}

	_, err = tx.Exec(
		ctx,
		`INSERT INTO reference_request_events (reference_request_id, event_type, actor_user_id, metadata)
		 SELECT $1, 'request_opened', NULL, '{}'::jsonb
		 WHERE NOT EXISTS (
		     SELECT 1 FROM reference_request_events
		     WHERE reference_request_id = $1 AND event_type = 'request_opened'
		 )`,
		requestID,
	)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (s *ReferenceRequestStore) ListSupportingDocumentsByTokenHash(ctx context.Context, tokenHash string) ([]SupportingDocument, error) {
	const query = `
		SELECT d.id, d.reference_request_id, d.candidate_user_id, d.storage_key, d.original_filename, d.safe_filename, d.file_extension, d.content_type, d.size_bytes, d.created_at
		FROM supporting_documents d
		INNER JOIN referee_invitations ri ON ri.reference_request_id = d.reference_request_id
		WHERE ri.token_hash = $1
		ORDER BY d.created_at ASC
	`
	rows, err := s.db.Query(ctx, query, tokenHash)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	documents := make([]SupportingDocument, 0)
	for rows.Next() {
		document := SupportingDocument{}
		err := rows.Scan(
			&document.ID,
			&document.ReferenceRequest,
			&document.CandidateUserID,
			&document.StorageKey,
			&document.OriginalFilename,
			&document.SafeFilename,
			&document.FileExtension,
			&document.ContentType,
			&document.SizeBytes,
			&document.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		documents = append(documents, document)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return documents, nil
}

func (s *ReferenceRequestStore) GetSupportingDocumentByTokenHash(ctx context.Context, tokenHash string, documentID uuid.UUID) (*SupportingDocument, error) {
	const query = `
		SELECT d.id, d.reference_request_id, d.candidate_user_id, d.storage_key, d.original_filename, d.safe_filename, d.file_extension, d.content_type, d.size_bytes, d.created_at
		FROM supporting_documents d
		INNER JOIN referee_invitations ri ON ri.reference_request_id = d.reference_request_id
		WHERE ri.token_hash = $1 AND d.id = $2
		LIMIT 1
	`
	document := &SupportingDocument{}
	err := s.db.QueryRow(ctx, query, tokenHash, documentID).Scan(
		&document.ID,
		&document.ReferenceRequest,
		&document.CandidateUserID,
		&document.StorageKey,
		&document.OriginalFilename,
		&document.SafeFilename,
		&document.FileExtension,
		&document.ContentType,
		&document.SizeBytes,
		&document.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrReferenceRequestNotFound
	}
	if err != nil {
		return nil, err
	}
	return document, nil
}

func (s *ReferenceRequestStore) SubmitReferenceByTokenHash(ctx context.Context, input SubmitReferenceInput) (*SubmittedReference, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	invitation := RefereeRequestView{}
	err = tx.QueryRow(
		ctx,
		`SELECT ri.id, r.id, r.candidate_user_id, u.full_name, u.email, ri.referee_name, ri.referee_email, ri.referee_relationship, r.institution_name, r.programme_name, r.opportunity_type, r.deadline_at, r.instructions, r.status, ri.expires_at, ri.revoked_at, ri.opened_at, ri.decision, ri.decided_at, ri.submitted_at, ri.delivered_at, ri.in_progress_at, ri.superseded_at, r.confidentiality_mode, r.organization, r.role, r.country_code, r.application_type, r.submission_method, r.preferred_completion_at, r.timezone, r.candidate_context, r.why_applying, r.relationship_context, r.traits, r.achievements
		 FROM referee_invitations ri
		 INNER JOIN reference_requests r ON r.id = ri.reference_request_id
		 INNER JOIN users u ON u.id = r.candidate_user_id
		 WHERE ri.token_hash = $1
		 FOR UPDATE`,
		input.TokenHash,
	).Scan(
		&invitation.InvitationID,
		&invitation.ReferenceRequestID,
		&invitation.CandidateUserID,
		&invitation.CandidateName,
		&invitation.CandidateEmail,
		&invitation.RefereeName,
		&invitation.RefereeEmail,
		&invitation.RefereeRelationship,
		&invitation.InstitutionName,
		&invitation.ProgrammeName,
		&invitation.OpportunityType,
		&invitation.DeadlineAt,
		&invitation.Instructions,
		&invitation.Status,
		&invitation.ExpiresAt,
		&invitation.RevokedAt,
		&invitation.OpenedAt,
		&invitation.Decision,
		&invitation.DecidedAt,
		&invitation.SubmittedAt,
		&invitation.DeliveredAt,
		&invitation.InProgressAt,
		&invitation.SupersededAt,
		&invitation.ConfidentialityMode,
		&invitation.Organization,
		&invitation.Role,
		&invitation.CountryCode,
		&invitation.ApplicationType,
		&invitation.SubmissionMethod,
		&invitation.PreferredCompletionAt,
		&invitation.Timezone,
		&invitation.CandidateContext,
		&invitation.WhyApplying,
		&invitation.RelationshipContext,
		&invitation.Traits,
		&invitation.Achievements,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrRefereeInvitationNotFound
	}
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	if invitation.RevokedAt != nil {
		return nil, ErrRefereeInvitationRevoked
	}
	if now.After(invitation.ExpiresAt) {
		return nil, ErrRefereeInvitationExpired
	}
	if invitation.SubmittedAt != nil {
		return nil, ErrRefereeAlreadySubmitted
	}
	if invitation.Decision == nil || *invitation.Decision != "accepted" {
		return nil, ErrRefereeDecisionRequired
	}

	submitted := &SubmittedReference{}
	err = tx.QueryRow(
		ctx,
		`INSERT INTO submitted_references (
		    reference_request_id, referee_invitation_id, storage_key, original_filename, safe_filename, file_extension, content_type, size_bytes
		 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		 RETURNING id, reference_request_id, referee_invitation_id, storage_key, original_filename, safe_filename, file_extension, content_type, size_bytes, submitted_at`,
		invitation.ReferenceRequestID,
		invitation.InvitationID,
		input.StorageKey,
		input.OriginalFilename,
		input.SafeFilename,
		input.FileExtension,
		input.ContentType,
		input.SizeBytes,
	).Scan(
		&submitted.ID,
		&submitted.ReferenceRequest,
		&submitted.InvitationID,
		&submitted.StorageKey,
		&submitted.OriginalFilename,
		&submitted.SafeFilename,
		&submitted.FileExtension,
		&submitted.ContentType,
		&submitted.SizeBytes,
		&submitted.SubmittedAt,
	)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(
		ctx,
		`UPDATE referee_invitations
		 SET submitted_at = NOW(), updated_at = NOW(), opened_at = COALESCE(opened_at, NOW())
		 WHERE id = $1`,
		invitation.InvitationID,
	)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(
		ctx,
		`UPDATE reference_requests
		 SET submitted_at = NOW(), status = 'submitted', updated_at = NOW(), opened_at = COALESCE(opened_at, NOW())
		 WHERE id = $1 AND active_invitation_id = $2`,
		invitation.ReferenceRequestID,
		invitation.InvitationID,
	)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(
		ctx,
		`INSERT INTO reference_request_events (reference_request_id, event_type, actor_user_id, metadata)
		 VALUES ($1, 'reference_submitted', NULL, jsonb_build_object('submitted_reference_id', $2::text))`,
		invitation.ReferenceRequestID,
		submitted.ID,
	)
	if err != nil {
		return nil, err
	}

	subject := "Reference submitted by " + invitation.RefereeName
	htmlBody := "<div style=\"font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;\">" +
		"<h2 style=\"margin:0 0 12px;\">Reference submitted</h2>" +
		"<p>Hello " + invitation.CandidateName + ",</p>" +
		"<p>Your referee, <strong>" + invitation.RefereeName + "</strong>, has submitted the reference.</p>" +
		"<p><strong>Institution/Company:</strong> " + invitation.InstitutionName + "<br />" +
		"<strong>Programme/Role:</strong> " + invitation.ProgrammeName + "</p>" +
		"<p>You can view this request from your dashboard.</p>" +
		"</div>"

	_, err = tx.Exec(
		ctx,
		`INSERT INTO notification_outbox (
		    reference_request_id, notification_type, channel, recipient_email, recipient_name, subject, html_body, status, attempt_count, max_attempts, available_at
		 ) VALUES ($1, 'submission_notification', 'email', $2, $3, $4, $5, 'queued', 0, 5, NOW())`,
		invitation.ReferenceRequestID,
		invitation.CandidateEmail,
		invitation.CandidateName,
		subject,
		htmlBody,
	)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return submitted, nil
}

func (s *ReferenceRequestStore) DecideRefereeInvitationByTokenHash(ctx context.Context, input RefereeDecisionInput) (*RefereeRequestView, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	view := RefereeRequestView{}
	err = tx.QueryRow(
		ctx,
		`SELECT ri.id, r.id, r.candidate_user_id, u.full_name, u.email, ri.referee_name, ri.referee_email, ri.referee_relationship, r.institution_name, r.programme_name, r.opportunity_type, r.deadline_at, r.instructions, r.status, ri.expires_at, ri.revoked_at, ri.opened_at, ri.decision, ri.decided_at, ri.submitted_at, ri.delivered_at, ri.in_progress_at, ri.superseded_at, r.confidentiality_mode, r.organization, r.role, r.country_code, r.application_type, r.submission_method, r.preferred_completion_at, r.timezone, r.candidate_context, r.why_applying, r.relationship_context, r.traits, r.achievements
		 FROM referee_invitations ri
		 INNER JOIN reference_requests r ON r.id = ri.reference_request_id
		 INNER JOIN users u ON u.id = r.candidate_user_id
		 WHERE ri.token_hash = $1
		 FOR UPDATE`,
		input.TokenHash,
	).Scan(
		&view.InvitationID,
		&view.ReferenceRequestID,
		&view.CandidateUserID,
		&view.CandidateName,
		&view.CandidateEmail,
		&view.RefereeName,
		&view.RefereeEmail,
		&view.RefereeRelationship,
		&view.InstitutionName,
		&view.ProgrammeName,
		&view.OpportunityType,
		&view.DeadlineAt,
		&view.Instructions,
		&view.Status,
		&view.ExpiresAt,
		&view.RevokedAt,
		&view.OpenedAt,
		&view.Decision,
		&view.DecidedAt,
		&view.SubmittedAt,
		&view.DeliveredAt,
		&view.InProgressAt,
		&view.SupersededAt,
		&view.ConfidentialityMode,
		&view.Organization,
		&view.Role,
		&view.CountryCode,
		&view.ApplicationType,
		&view.SubmissionMethod,
		&view.PreferredCompletionAt,
		&view.Timezone,
		&view.CandidateContext,
		&view.WhyApplying,
		&view.RelationshipContext,
		&view.Traits,
		&view.Achievements,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrRefereeInvitationNotFound
	}
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	if view.RevokedAt != nil {
		return nil, ErrRefereeInvitationRevoked
	}
	if now.After(view.ExpiresAt) {
		return nil, ErrRefereeInvitationExpired
	}
	if view.SubmittedAt != nil {
		return nil, ErrRefereeAlreadySubmitted
	}
	if view.Decision != nil {
		return nil, ErrRefereeDecisionAlreadyMade
	}

	status := "accepted"
	eventType := "request_accepted"
	notificationType := "referee_accepted"
	subject := "Referee accepted your request"
	body := "<div style=\"font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;\">" +
		"<h2 style=\"margin:0 0 12px;\">Referee accepted</h2>" +
		"<p>Hello " + view.CandidateName + ",</p>" +
		"<p>" + view.RefereeName + " accepted your reference request.</p>" +
		"<p><strong>Institution/Company:</strong> " + view.InstitutionName + "<br />" +
		"<strong>Programme/Role:</strong> " + view.ProgrammeName + "</p>" +
		"</div>"
	if input.Decision == "declined" {
		status = "declined"
		eventType = "request_declined"
		notificationType = "referee_declined"
		subject = "Referee declined your request"
		body = "<div style=\"font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;\">" +
			"<h2 style=\"margin:0 0 12px;\">Referee declined</h2>" +
			"<p>Hello " + view.CandidateName + ",</p>" +
			"<p>" + view.RefereeName + " declined your reference request.</p>" +
			"<p><strong>Institution/Company:</strong> " + view.InstitutionName + "<br />" +
			"<strong>Programme/Role:</strong> " + view.ProgrammeName + "</p>" +
			"</div>"
	}

	_, err = tx.Exec(
		ctx,
		`UPDATE referee_invitations
		 SET decision = $2, decided_at = NOW(), opened_at = COALESCE(opened_at, NOW()), updated_at = NOW()
		 WHERE id = $1`,
		view.InvitationID,
		input.Decision,
	)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(
		ctx,
		`UPDATE reference_requests
		 SET status = $2, opened_at = COALESCE(opened_at, NOW()), updated_at = NOW()
		 WHERE id = $1 AND active_invitation_id = $3`,
		view.ReferenceRequestID,
		status,
		view.InvitationID,
	)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(
		ctx,
		`INSERT INTO reference_request_events (reference_request_id, event_type, actor_user_id, metadata)
		 VALUES ($1, $2, NULL, '{}'::jsonb)`,
		view.ReferenceRequestID,
		eventType,
	)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(
		ctx,
		`INSERT INTO notification_outbox (
		    reference_request_id, notification_type, channel, recipient_email, recipient_name, subject, html_body, status, attempt_count, max_attempts, available_at
		 ) VALUES ($1, $2, 'email', $3, $4, $5, $6, 'queued', 0, 5, NOW())`,
		view.ReferenceRequestID,
		notificationType,
		view.CandidateEmail,
		view.CandidateName,
		subject,
		body,
	)
	if err != nil {
		return nil, err
	}

	view.Status = status
	decision := input.Decision
	view.Decision = &decision
	view.DecidedAt = &now

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &view, nil
}
