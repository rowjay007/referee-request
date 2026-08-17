package store

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrReferenceRequestNotFound = errors.New("reference request not found")
var ErrReferenceRequestAlreadySent = errors.New("reference request already sent")

type ReferenceRequest struct {
	ID                  uuid.UUID
	CandidateUserID     uuid.UUID
	RefereeName         string
	RefereeEmail        string
	RefereeRelationship string
	InstitutionName     string
	ProgrammeName       string
	OpportunityType     string
	DeadlineAt          time.Time
	Instructions        string
	Status              string
	SentAt              *time.Time
	OpenedAt            *time.Time
	SubmittedAt         *time.Time
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

type CreateReferenceRequestInput struct {
	CandidateUserID     uuid.UUID
	RefereeName         string
	RefereeEmail        string
	RefereeRelationship string
	InstitutionName     string
	ProgrammeName       string
	OpportunityType     string
	DeadlineAt          time.Time
	Instructions        string
}

type SupportingDocument struct {
	ID               uuid.UUID
	ReferenceRequest uuid.UUID
	CandidateUserID  uuid.UUID
	StorageKey       string
	OriginalFilename string
	SafeFilename     string
	FileExtension    string
	ContentType      string
	SizeBytes        int64
	CreatedAt        time.Time
}

type CreateSupportingDocumentInput struct {
	ReferenceRequest uuid.UUID
	CandidateUserID  uuid.UUID
	StorageKey       string
	OriginalFilename string
	SafeFilename     string
	FileExtension    string
	ContentType      string
	SizeBytes        int64
}

type ReferenceRequestStore struct {
	db *pgxpool.Pool
}

func NewReferenceRequestStore(db *pgxpool.Pool) *ReferenceRequestStore {
	return &ReferenceRequestStore{db: db}
}

func (s *ReferenceRequestStore) CreateReferenceRequest(ctx context.Context, input CreateReferenceRequestInput) (*ReferenceRequest, error) {
	const query = `
		INSERT INTO reference_requests (
			candidate_user_id, referee_name, referee_email, referee_relationship,
			institution_name, programme_name, opportunity_type, deadline_at, instructions, status
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft')
		RETURNING id, candidate_user_id, referee_name, referee_email, referee_relationship, institution_name, programme_name, opportunity_type, deadline_at, instructions, status, sent_at, opened_at, submitted_at, created_at, updated_at
	`

	row := s.db.QueryRow(
		ctx,
		query,
		input.CandidateUserID,
		input.RefereeName,
		input.RefereeEmail,
		input.RefereeRelationship,
		input.InstitutionName,
		input.ProgrammeName,
		input.OpportunityType,
		input.DeadlineAt,
		input.Instructions,
	)
	return scanReferenceRequest(row)
}

func (s *ReferenceRequestStore) ListReferenceRequestsByCandidate(ctx context.Context, candidateUserID uuid.UUID) ([]ReferenceRequest, error) {
	const query = `
		SELECT id, candidate_user_id, referee_name, referee_email, referee_relationship, institution_name, programme_name, opportunity_type, deadline_at, instructions, status, sent_at, opened_at, submitted_at, created_at, updated_at
		FROM reference_requests
		WHERE candidate_user_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(ctx, query, candidateUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	requests := make([]ReferenceRequest, 0)
	for rows.Next() {
		request, err := scanReferenceRequest(rows)
		if err != nil {
			return nil, err
		}
		requests = append(requests, *request)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return requests, nil
}

func (s *ReferenceRequestStore) GetReferenceRequestByIDForCandidate(ctx context.Context, id, candidateUserID uuid.UUID) (*ReferenceRequest, error) {
	const query = `
		SELECT id, candidate_user_id, referee_name, referee_email, referee_relationship, institution_name, programme_name, opportunity_type, deadline_at, instructions, status, sent_at, opened_at, submitted_at, created_at, updated_at
		FROM reference_requests
		WHERE id = $1 AND candidate_user_id = $2
		LIMIT 1
	`
	row := s.db.QueryRow(ctx, query, id, candidateUserID)
	request, err := scanReferenceRequest(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrReferenceRequestNotFound
	}
	if err != nil {
		return nil, err
	}
	return request, nil
}

func (s *ReferenceRequestStore) MarkReferenceRequestSent(ctx context.Context, id, candidateUserID uuid.UUID) (*ReferenceRequest, error) {
	const query = `
		UPDATE reference_requests
		SET status = 'sent', sent_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND candidate_user_id = $2 AND status = 'draft'
		RETURNING id, candidate_user_id, referee_name, referee_email, referee_relationship, institution_name, programme_name, opportunity_type, deadline_at, instructions, status, sent_at, opened_at, submitted_at, created_at, updated_at
	`
	request, err := scanReferenceRequest(s.db.QueryRow(ctx, query, id, candidateUserID))
	if errors.Is(err, pgx.ErrNoRows) {
		existing, getErr := s.GetReferenceRequestByIDForCandidate(ctx, id, candidateUserID)
		if getErr != nil {
			return nil, getErr
		}
		if existing.Status != "draft" {
			return nil, ErrReferenceRequestAlreadySent
		}
		return nil, ErrReferenceRequestNotFound
	}
	if err != nil {
		return nil, err
	}

	_, historyErr := s.db.Exec(
		ctx,
		`INSERT INTO reference_request_events (reference_request_id, event_type, actor_user_id, metadata) VALUES ($1, 'request_sent', $2, '{}'::jsonb)`,
		id,
		candidateUserID,
	)
	if historyErr != nil {
		return nil, historyErr
	}

	return request, nil
}

func (s *ReferenceRequestStore) CreateSupportingDocument(ctx context.Context, input CreateSupportingDocumentInput) (*SupportingDocument, error) {
	const query = `
		INSERT INTO supporting_documents (
			reference_request_id, candidate_user_id, storage_key, original_filename,
			safe_filename, file_extension, content_type, size_bytes
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING id, reference_request_id, candidate_user_id, storage_key, original_filename, safe_filename, file_extension, content_type, size_bytes, created_at
	`
	document := &SupportingDocument{}
	err := s.db.QueryRow(
		ctx,
		query,
		input.ReferenceRequest,
		input.CandidateUserID,
		input.StorageKey,
		input.OriginalFilename,
		input.SafeFilename,
		input.FileExtension,
		input.ContentType,
		input.SizeBytes,
	).Scan(
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
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return nil, ErrReferenceRequestNotFound
		}
		return nil, err
	}
	return document, nil
}

func (s *ReferenceRequestStore) ListSupportingDocuments(ctx context.Context, referenceRequestID, candidateUserID uuid.UUID) ([]SupportingDocument, error) {
	const query = `
		SELECT d.id, d.reference_request_id, d.candidate_user_id, d.storage_key, d.original_filename, d.safe_filename, d.file_extension, d.content_type, d.size_bytes, d.created_at
		FROM supporting_documents d
		INNER JOIN reference_requests r ON r.id = d.reference_request_id
		WHERE d.reference_request_id = $1 AND r.candidate_user_id = $2
		ORDER BY d.created_at ASC
	`
	rows, err := s.db.Query(ctx, query, referenceRequestID, candidateUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	documents := make([]SupportingDocument, 0)
	for rows.Next() {
		document := SupportingDocument{}
		if err := rows.Scan(
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
		); err != nil {
			return nil, err
		}
		documents = append(documents, document)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return documents, nil
}

type referenceRequestScanner interface {
	Scan(dest ...any) error
}

func scanReferenceRequest(scanner referenceRequestScanner) (*ReferenceRequest, error) {
	request := &ReferenceRequest{}
	err := scanner.Scan(
		&request.ID,
		&request.CandidateUserID,
		&request.RefereeName,
		&request.RefereeEmail,
		&request.RefereeRelationship,
		&request.InstitutionName,
		&request.ProgrammeName,
		&request.OpportunityType,
		&request.DeadlineAt,
		&request.Instructions,
		&request.Status,
		&request.SentAt,
		&request.OpenedAt,
		&request.SubmittedAt,
		&request.CreatedAt,
		&request.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return request, nil
}
