package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

var ErrReferenceRequestNotDraft = errors.New("reference request is not a draft")
var ErrReferenceRequestEditConflict = errors.New("reference request edit conflict")
var ErrReferenceRequestReplacementNotAllowed = errors.New("reference request replacement not allowed")
var ErrSubmittedReferenceConfidential = errors.New("submitted reference is confidential")
var ErrSubmittedReferenceNotFound = errors.New("submitted reference not found")
var ErrRefereeContactNotFound = errors.New("referee contact not found")
var ErrNotificationNotFound = errors.New("notification not found")
var ErrRefereeInProgressNotAllowed = errors.New("referee in-progress transition not allowed")

type RefereeContact struct {
	ID              uuid.UUID
	CandidateUserID uuid.UUID
	Name            string
	Email           string
	Relationship    string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type RefereeContactInput struct {
	CandidateUserID uuid.UUID
	Name            string
	Email           string
	Relationship    string
}

type UpdateDraftInput struct {
	Request         CreateReferenceRequestInput
	RequestID       uuid.UUID
	ExpectedUpdated time.Time
}

type ReplacementInput struct {
	RequestID           uuid.UUID
	CandidateUserID     uuid.UUID
	RefereeName         string
	RefereeEmail        string
	RefereeRelationship string
	TokenHash           string
	ExpiresAt           time.Time
	RefereeLink         string
}

type OutcomeInput struct {
	RequestID       uuid.UUID
	CandidateUserID uuid.UUID
	Outcome         string
	Note            string
}

func (s *ReferenceRequestStore) UpdateDraft(ctx context.Context, input UpdateDraftInput) (*ReferenceRequest, error) {
	request, err := scanReferenceRequest(s.db.QueryRow(ctx, `
		UPDATE reference_requests SET
			referee_name=$4, referee_email=$5, referee_relationship=$6,
			institution_name=$7, programme_name=$8, opportunity_type=$9,
			deadline_at=$10, instructions=$11, confidentiality_mode=$12,
			organization=$13, role=$14, country_code=$15, application_type=$16,
			submission_method=$17, preferred_completion_at=$18, timezone=$19,
			candidate_context=$20, why_applying=$21, relationship_context=$22,
			traits=$23, achievements=$24, updated_at=NOW()
		WHERE id=$1 AND candidate_user_id=$2 AND updated_at=$3 AND status='draft'
		RETURNING `+referenceRequestColumns,
		input.RequestID, input.Request.CandidateUserID, input.ExpectedUpdated,
		input.Request.RefereeName, input.Request.RefereeEmail, input.Request.RefereeRelationship,
		input.Request.InstitutionName, input.Request.ProgrammeName, input.Request.OpportunityType,
		input.Request.DeadlineAt, input.Request.Instructions, input.Request.ConfidentialityMode,
		input.Request.Organization, input.Request.Role, input.Request.CountryCode, input.Request.ApplicationType,
		input.Request.SubmissionMethod, input.Request.PreferredCompletionAt, input.Request.Timezone,
		input.Request.CandidateContext, input.Request.WhyApplying, input.Request.RelationshipContext,
		input.Request.Traits, input.Request.Achievements))
	if !errors.Is(err, pgx.ErrNoRows) {
		return request, err
	}
	existing, getErr := s.GetReferenceRequestByIDForCandidate(ctx, input.RequestID, input.Request.CandidateUserID)
	if getErr != nil {
		return nil, getErr
	}
	if existing.Status != "draft" {
		return nil, ErrReferenceRequestNotDraft
	}
	return nil, ErrReferenceRequestEditConflict
}

func (s *ReferenceRequestStore) ListRefereeContacts(ctx context.Context, candidateUserID uuid.UUID) ([]RefereeContact, error) {
	rows, err := s.db.Query(ctx, `SELECT id, candidate_user_id, name, email, relationship, created_at, updated_at
		FROM referee_contacts WHERE candidate_user_id=$1 ORDER BY name, created_at DESC`, candidateUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	contacts := make([]RefereeContact, 0)
	for rows.Next() {
		contact, err := scanRefereeContact(rows)
		if err != nil {
			return nil, err
		}
		contacts = append(contacts, *contact)
	}
	return contacts, rows.Err()
}

func (s *ReferenceRequestStore) CreateRefereeContact(ctx context.Context, input RefereeContactInput) (*RefereeContact, error) {
	return scanRefereeContact(s.db.QueryRow(ctx, `INSERT INTO referee_contacts (candidate_user_id, name, email, relationship)
		VALUES ($1,$2,$3,$4)
		ON CONFLICT (candidate_user_id, email) DO UPDATE SET name=EXCLUDED.name, relationship=EXCLUDED.relationship, updated_at=NOW()
		RETURNING id, candidate_user_id, name, email, relationship, created_at, updated_at`,
		input.CandidateUserID, input.Name, input.Email, input.Relationship))
}

func (s *ReferenceRequestStore) UpdateRefereeContact(ctx context.Context, id uuid.UUID, input RefereeContactInput) (*RefereeContact, error) {
	contact, err := scanRefereeContact(s.db.QueryRow(ctx, `UPDATE referee_contacts SET name=$3, email=$4, relationship=$5, updated_at=NOW()
		WHERE id=$1 AND candidate_user_id=$2
		RETURNING id, candidate_user_id, name, email, relationship, created_at, updated_at`,
		id, input.CandidateUserID, input.Name, input.Email, input.Relationship))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrRefereeContactNotFound
	}
	return contact, err
}

func (s *ReferenceRequestStore) DeleteRefereeContact(ctx context.Context, id, candidateUserID uuid.UUID) error {
	result, err := s.db.Exec(ctx, `DELETE FROM referee_contacts WHERE id=$1 AND candidate_user_id=$2`, id, candidateUserID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrRefereeContactNotFound
	}
	return nil
}

func (s *ReferenceRequestStore) RepeatReferenceRequest(ctx context.Context, sourceID, candidateUserID uuid.UUID, contactID *uuid.UUID) (*ReferenceRequest, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	source, err := scanReferenceRequest(tx.QueryRow(ctx, `SELECT `+referenceRequestColumns+` FROM reference_requests WHERE id=$1 AND candidate_user_id=$2`, sourceID, candidateUserID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrReferenceRequestNotFound
	}
	if err != nil {
		return nil, err
	}
	if contactID != nil {
		contact, contactErr := scanRefereeContact(tx.QueryRow(ctx, `SELECT id, candidate_user_id, name, email, relationship, created_at, updated_at
			FROM referee_contacts WHERE id=$1 AND candidate_user_id=$2`, *contactID, candidateUserID))
		if errors.Is(contactErr, pgx.ErrNoRows) {
			return nil, ErrRefereeContactNotFound
		}
		if contactErr != nil {
			return nil, contactErr
		}
		source.RefereeName, source.RefereeEmail, source.RefereeRelationship = contact.Name, contact.Email, contact.Relationship
	}
	request, err := scanReferenceRequest(tx.QueryRow(ctx, `INSERT INTO reference_requests (
		candidate_user_id, referee_name, referee_email, referee_relationship, institution_name, programme_name,
		opportunity_type, deadline_at, instructions, confidentiality_mode, organization, role, country_code,
		application_type, submission_method, preferred_completion_at, timezone, candidate_context, why_applying,
		relationship_context, traits, achievements, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,'draft')
		RETURNING `+referenceRequestColumns,
		candidateUserID, source.RefereeName, source.RefereeEmail, source.RefereeRelationship,
		source.InstitutionName, source.ProgrammeName, source.OpportunityType, source.DeadlineAt, source.Instructions,
		source.ConfidentialityMode, source.Organization, source.Role, source.CountryCode, source.ApplicationType,
		source.SubmissionMethod, source.PreferredCompletionAt, source.Timezone, source.CandidateContext,
		source.WhyApplying, source.RelationshipContext, source.Traits, source.Achievements))
	if err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO reference_request_events (reference_request_id, event_type, actor_user_id, metadata)
		VALUES ($1,'request_repeated',$2,jsonb_build_object('source_request_id',$3::text))`, request.ID, candidateUserID, sourceID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return request, nil
}

func (s *ReferenceRequestStore) SetOutcome(ctx context.Context, input OutcomeInput) (*ReferenceRequest, error) {
	request, err := scanReferenceRequest(s.db.QueryRow(ctx, `UPDATE reference_requests
		SET outcome=$3, outcome_note=NULLIF($4,''), outcome_at=NOW(), updated_at=NOW()
		WHERE id=$1 AND candidate_user_id=$2 RETURNING `+referenceRequestColumns,
		input.RequestID, input.CandidateUserID, input.Outcome, input.Note))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrReferenceRequestNotFound
	}
	return request, err
}

func (s *ReferenceRequestStore) ListInvitationsForCandidate(ctx context.Context, requestID, candidateUserID uuid.UUID) ([]RefereeInvitation, error) {
	rows, err := s.db.Query(ctx, `SELECT ri.id, ri.reference_request_id, ri.token_hash, ri.expires_at, ri.revoked_at,
		ri.opened_at, ri.decision, ri.decided_at, ri.submitted_at, ri.created_at, ri.updated_at,
		ri.referee_name, ri.referee_email, ri.referee_relationship, ri.delivered_at, ri.in_progress_at, ri.superseded_at
		FROM referee_invitations ri JOIN reference_requests r ON r.id=ri.reference_request_id
		WHERE ri.reference_request_id=$1 AND r.candidate_user_id=$2 ORDER BY ri.created_at DESC`, requestID, candidateUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]RefereeInvitation, 0)
	for rows.Next() {
		item := RefereeInvitation{}
		if err := scanInvitation(rows, &item); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *ReferenceRequestStore) ReplaceReferee(ctx context.Context, input ReplacementInput) (*ReferenceRequest, *RefereeInvitation, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	request, err := scanReferenceRequest(tx.QueryRow(ctx, `SELECT `+referenceRequestColumns+` FROM reference_requests
		WHERE id=$1 AND candidate_user_id=$2 FOR UPDATE`, input.RequestID, input.CandidateUserID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil, ErrReferenceRequestNotFound
	}
	if err != nil {
		return nil, nil, err
	}
	if request.Status == "draft" || request.Status == "submitted" || request.Status == "cancelled" || request.Status == "expired" {
		return nil, nil, ErrReferenceRequestReplacementNotAllowed
	}
	_, err = tx.Exec(ctx, `UPDATE referee_invitations SET revoked_at=COALESCE(revoked_at,NOW()), superseded_at=COALESCE(superseded_at,NOW()), updated_at=NOW()
		WHERE id=$1 AND revoked_at IS NULL AND superseded_at IS NULL`, request.ActiveInvitationID)
	if err != nil {
		return nil, nil, err
	}
	_, err = tx.Exec(ctx, `UPDATE notification_outbox SET status='dead', last_error='invitation superseded', updated_at=NOW()
		WHERE referee_invitation_id=$1 AND status IN ('queued','failed')`, request.ActiveInvitationID)
	if err != nil {
		return nil, nil, err
	}
	invitation := &RefereeInvitation{}
	err = scanInvitation(tx.QueryRow(ctx, `INSERT INTO referee_invitations
		(reference_request_id, token_hash, expires_at, referee_name, referee_email, referee_relationship)
		VALUES ($1,$2,$3,$4,$5,$6)
		RETURNING id, reference_request_id, token_hash, expires_at, revoked_at, opened_at, decision, decided_at,
		submitted_at, created_at, updated_at, referee_name, referee_email, referee_relationship, delivered_at, in_progress_at, superseded_at`,
		input.RequestID, input.TokenHash, input.ExpiresAt, input.RefereeName, input.RefereeEmail, input.RefereeRelationship), invitation)
	if err != nil {
		return nil, nil, err
	}
	request, err = scanReferenceRequest(tx.QueryRow(ctx, `UPDATE reference_requests SET active_invitation_id=$3,
		referee_name=$4, referee_email=$5, referee_relationship=$6, relationship_context=$6,
		status='sent', sent_at=NOW(), opened_at=NULL, updated_at=NOW()
		WHERE id=$1 AND candidate_user_id=$2 RETURNING `+referenceRequestColumns,
		input.RequestID, input.CandidateUserID, invitation.ID, input.RefereeName, input.RefereeEmail, input.RefereeRelationship))
	if err != nil {
		return nil, nil, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO referee_contacts (candidate_user_id,name,email,relationship) VALUES ($1,$2,$3,$4)
		ON CONFLICT (candidate_user_id,email) DO UPDATE SET name=EXCLUDED.name,relationship=EXCLUDED.relationship,updated_at=NOW()`,
		input.CandidateUserID, input.RefereeName, input.RefereeEmail, input.RefereeRelationship)
	if err != nil {
		return nil, nil, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO reference_request_events (reference_request_id,event_type,actor_user_id,metadata)
		VALUES ($1,'referee_replaced',$2,jsonb_build_object('invitation_id',$3::text))`, input.RequestID, input.CandidateUserID, invitation.ID)
	if err != nil {
		return nil, nil, err
	}
	subject := "Reference request invitation"
	body := fmt.Sprintf("<p>Hello %s,</p><p>Please use this secure link to complete the reference request: <a href=\"%s\">%s</a></p>", input.RefereeName, input.RefereeLink, input.RefereeLink)
	_, err = tx.Exec(ctx, `INSERT INTO notification_outbox (reference_request_id,referee_invitation_id,notification_type,channel,
		recipient_email,recipient_name,subject,html_body,status,attempt_count,max_attempts,available_at)
		VALUES ($1,$2,'invitation_email','email',$3,$4,$5,$6,'queued',0,5,NOW())`,
		input.RequestID, invitation.ID, input.RefereeEmail, input.RefereeName, subject, body)
	if err != nil {
		return nil, nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}
	return request, invitation, nil
}

func (s *ReferenceRequestStore) MarkInvitationDeliveredByProviderID(ctx context.Context, providerID string) error {
	result, err := s.db.Exec(ctx, `WITH delivered AS (
		UPDATE notification_outbox SET delivered_at=COALESCE(delivered_at,NOW()), updated_at=NOW()
		WHERE provider_message_id=$1 AND notification_type='invitation_email' RETURNING referee_invitation_id
	), invitation AS (
		UPDATE referee_invitations ri SET delivered_at=COALESCE(ri.delivered_at,NOW()), updated_at=NOW()
		FROM delivered d WHERE ri.id=d.referee_invitation_id RETURNING ri.reference_request_id,ri.id
	)
	UPDATE reference_requests r SET status=CASE WHEN r.status='sent' THEN 'delivered' ELSE r.status END, updated_at=NOW()
	FROM invitation i WHERE r.id=i.reference_request_id AND r.active_invitation_id=i.id`, providerID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		var exists bool
		if err := s.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM notification_outbox WHERE provider_message_id=$1 AND delivered_at IS NOT NULL)`, providerID).Scan(&exists); err != nil {
			return err
		}
		if !exists {
			return ErrNotificationNotFound
		}
	}
	return nil
}

func (s *ReferenceRequestStore) MarkRefereeInProgress(ctx context.Context, tokenHash string) (*RefereeRequestView, error) {
	result, err := s.db.Exec(ctx, `WITH invitation AS (
		UPDATE referee_invitations SET in_progress_at=COALESCE(in_progress_at,NOW()), updated_at=NOW()
		WHERE token_hash=$1 AND revoked_at IS NULL AND decision='accepted' AND submitted_at IS NULL AND expires_at>NOW()
		RETURNING id,reference_request_id
	)
	UPDATE reference_requests r SET status=CASE WHEN r.status='accepted' THEN 'in_progress' ELSE r.status END,updated_at=NOW()
	FROM invitation i WHERE r.id=i.reference_request_id AND r.active_invitation_id=i.id`, tokenHash)
	if err != nil {
		return nil, err
	}
	if result.RowsAffected() == 0 {
		view, getErr := s.GetRefereeRequestByTokenHash(ctx, tokenHash)
		if getErr != nil {
			return nil, getErr
		}
		if view.InProgressAt == nil {
			return nil, ErrRefereeInProgressNotAllowed
		}
		return view, nil
	}
	return s.GetRefereeRequestByTokenHash(ctx, tokenHash)
}

func (s *ReferenceRequestStore) GetSubmittedReferenceForCandidate(ctx context.Context, requestID, candidateUserID uuid.UUID) (*SubmittedReference, error) {
	var confidentiality string
	item := &SubmittedReference{}
	err := s.db.QueryRow(ctx, `SELECT r.confidentiality_mode,s.id,s.reference_request_id,s.referee_invitation_id,s.storage_key,
		s.original_filename,s.safe_filename,s.file_extension,s.content_type,s.size_bytes,s.submitted_at
		FROM reference_requests r JOIN submitted_references s ON s.reference_request_id=r.id
		WHERE r.id=$1 AND r.candidate_user_id=$2`, requestID, candidateUserID).Scan(
		&confidentiality, &item.ID, &item.ReferenceRequest, &item.InvitationID, &item.StorageKey,
		&item.OriginalFilename, &item.SafeFilename, &item.FileExtension, &item.ContentType, &item.SizeBytes, &item.SubmittedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrSubmittedReferenceNotFound
	}
	if err != nil {
		return nil, err
	}
	if confidentiality != "non_confidential" {
		return nil, ErrSubmittedReferenceConfidential
	}
	return item, nil
}

func scanRefereeContact(scanner referenceRequestScanner) (*RefereeContact, error) {
	contact := &RefereeContact{}
	err := scanner.Scan(&contact.ID, &contact.CandidateUserID, &contact.Name, &contact.Email, &contact.Relationship, &contact.CreatedAt, &contact.UpdatedAt)
	return contact, err
}

func scanInvitation(scanner referenceRequestScanner, invitation *RefereeInvitation) error {
	return scanner.Scan(&invitation.ID, &invitation.ReferenceRequestID, &invitation.TokenHash, &invitation.ExpiresAt,
		&invitation.RevokedAt, &invitation.OpenedAt, &invitation.Decision, &invitation.DecidedAt, &invitation.SubmittedAt,
		&invitation.CreatedAt, &invitation.UpdatedAt, &invitation.RefereeName, &invitation.RefereeEmail,
		&invitation.RefereeRelationship, &invitation.DeliveredAt, &invitation.InProgressAt, &invitation.SupersededAt)
}

func NormalizePacketInput(input *CreateReferenceRequestInput) {
	if input.ConfidentialityMode == "" {
		input.ConfidentialityMode = "confidential"
	}
	if input.Organization == "" {
		input.Organization = input.InstitutionName
	}
	if input.InstitutionName == "" {
		input.InstitutionName = input.Organization
	}
	if input.Role == "" {
		input.Role = input.ProgrammeName
	}
	if input.ProgrammeName == "" {
		input.ProgrammeName = input.Role
	}
	if input.ApplicationType == "" {
		input.ApplicationType = input.OpportunityType
	}
	if input.OpportunityType == "" {
		input.OpportunityType = input.ApplicationType
	}
	if input.CandidateContext == "" {
		input.CandidateContext = input.Instructions
	}
	if input.Instructions == "" {
		input.Instructions = input.CandidateContext
	}
	if input.RelationshipContext == "" {
		input.RelationshipContext = input.RefereeRelationship
	}
	if input.Timezone == "" {
		input.Timezone = "UTC"
	}
	input.CountryCode = strings.ToUpper(input.CountryCode)
}
