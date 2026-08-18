package store

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

var ErrRefereeInvitationNotFound = errors.New("referee invitation not found")
var ErrRefereeInvitationExpired = errors.New("referee invitation expired")
var ErrRefereeInvitationRevoked = errors.New("referee invitation revoked")
var ErrRefereeAlreadySubmitted = errors.New("reference already submitted")

type RefereeInvitation struct {
	ID                 uuid.UUID
	ReferenceRequestID uuid.UUID
	TokenHash          string
	ExpiresAt          time.Time
	RevokedAt          *time.Time
	OpenedAt           *time.Time
	SubmittedAt        *time.Time
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

type RefereeRequestView struct {
	InvitationID        uuid.UUID
	ReferenceRequestID  uuid.UUID
	CandidateUserID     uuid.UUID
	CandidateName       string
	CandidateEmail      string
	RefereeName         string
	RefereeEmail        string
	RefereeRelationship string
	InstitutionName     string
	ProgrammeName       string
	OpportunityType     string
	DeadlineAt          time.Time
	Instructions        string
	Status              string
	ExpiresAt           time.Time
	RevokedAt           *time.Time
	OpenedAt            *time.Time
	SubmittedAt         *time.Time
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
		 RETURNING id, candidate_user_id, referee_name, referee_email, referee_relationship, institution_name, programme_name, opportunity_type, deadline_at, instructions, status, sent_at, opened_at, submitted_at, created_at, updated_at`,
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
		`INSERT INTO referee_invitations (reference_request_id, token_hash, expires_at)
		 VALUES ($1, $2, $3)
		 RETURNING id, reference_request_id, token_hash, expires_at, revoked_at, opened_at, submitted_at, created_at, updated_at`,
		requestID,
		tokenHash,
		expiresAt,
	).Scan(
		&invitation.ID,
		&invitation.ReferenceRequestID,
		&invitation.TokenHash,
		&invitation.ExpiresAt,
		&invitation.RevokedAt,
		&invitation.OpenedAt,
		&invitation.SubmittedAt,
		&invitation.CreatedAt,
		&invitation.UpdatedAt,
	)
	if insertErr != nil {
		return nil, nil, insertErr
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
			r.referee_name,
			r.referee_email,
			r.referee_relationship,
			r.institution_name,
			r.programme_name,
			r.opportunity_type,
			r.deadline_at,
			r.instructions,
			r.status,
			ri.expires_at,
			ri.revoked_at,
			ri.opened_at,
			ri.submitted_at
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
		&view.SubmittedAt,
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
		     status = CASE WHEN status = 'sent' THEN 'opened' ELSE status END,
		     updated_at = NOW()
		 WHERE id = $1`,
		requestID,
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
		`SELECT ri.id, r.id, r.candidate_user_id, u.full_name, u.email, r.referee_name, r.referee_email, r.referee_relationship, r.institution_name, r.programme_name, r.opportunity_type, r.deadline_at, r.instructions, r.status, ri.expires_at, ri.revoked_at, ri.opened_at, ri.submitted_at
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
		&invitation.SubmittedAt,
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
		 WHERE id = $1`,
		invitation.ReferenceRequestID,
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

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return submitted, nil
}
