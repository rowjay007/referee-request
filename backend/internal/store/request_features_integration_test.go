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

func TestRequestFeatureLifecycle(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL is required for integration tests")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	var migrated bool
	if err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='reference_requests' AND column_name='active_invitation_id')`).Scan(&migrated); err != nil || !migrated {
		t.Skip("migration 000006 is required")
	}
	candidateID, otherID := uuid.New(), uuid.New()
	for _, id := range []uuid.UUID{candidateID, otherID} {
		_, err := pool.Exec(ctx, `INSERT INTO users(id,email,full_name,password_hash) VALUES($1,$2,'Candidate','unused')`, id, id.String()+"@example.com")
		if err != nil {
			t.Fatalf("create user: %v", err)
		}
	}
	t.Cleanup(func() { _, _ = pool.Exec(ctx, `DELETE FROM users WHERE id=ANY($1)`, []uuid.UUID{candidateID, otherID}) })
	s := NewReferenceRequestStore(pool)
	deadline := time.Now().UTC().Add(72 * time.Hour).Truncate(time.Microsecond)
	input := CreateReferenceRequestInput{CandidateUserID: candidateID, RefereeName: "First Referee", RefereeEmail: "first@example.com",
		RefereeRelationship: "Manager", InstitutionName: "Legacy Org", ProgrammeName: "Legacy Role", OpportunityType: "job",
		DeadlineAt: deadline, Instructions: "Context", ConfidentialityMode: "non_confidential", Organization: "Global Org", Role: "Engineer",
		CountryCode: "GB", ApplicationType: "employment", SubmissionMethod: "portal", PreferredCompletionAt: &deadline,
		Timezone: "Europe/London", CandidateContext: "Candidate context", WhyApplying: "Growth", RelationshipContext: "Managed for two years",
		Traits: "Reliable", Achievements: "Shipped platform"}
	request, err := s.CreateReferenceRequest(ctx, input)
	if err != nil {
		t.Fatalf("create request: %v", err)
	}

	stale := request.UpdatedAt.Add(-time.Second)
	_, err = s.UpdateDraft(ctx, UpdateDraftInput{Request: input, RequestID: request.ID, ExpectedUpdated: stale})
	if !errors.Is(err, ErrReferenceRequestEditConflict) {
		t.Fatalf("stale patch error = %v", err)
	}
	input.Role = "Senior Engineer"
	request, err = s.UpdateDraft(ctx, UpdateDraftInput{Request: input, RequestID: request.ID, ExpectedUpdated: request.UpdatedAt})
	if err != nil || request.Role != "Senior Engineer" {
		t.Fatalf("patch = %#v, %v", request, err)
	}

	contacts, err := s.ListRefereeContacts(ctx, candidateID)
	if err != nil || len(contacts) != 1 {
		t.Fatalf("contacts = %d, %v", len(contacts), err)
	}
	if err := s.DeleteRefereeContact(ctx, contacts[0].ID, otherID); !errors.Is(err, ErrRefereeContactNotFound) {
		t.Fatalf("cross-owner delete error = %v", err)
	}
	repeated, err := s.RepeatReferenceRequest(ctx, request.ID, candidateID, &contacts[0].ID)
	if err != nil || repeated.Role != request.Role || repeated.Status != "draft" {
		t.Fatalf("repeat = %#v, %v", repeated, err)
	}

	request, err = s.SetOutcome(ctx, OutcomeInput{RequestID: request.ID, CandidateUserID: candidateID, Outcome: "successful", Note: "Offer received"})
	if err != nil || request.Outcome == nil || *request.Outcome != "successful" || request.Status != "draft" {
		t.Fatalf("outcome = %#v, %v", request, err)
	}

	request, firstInvitation, err := s.SendReferenceRequestWithInvitation(ctx, request.ID, candidateID, "token-one", deadline, "https://example.test/one")
	if err != nil {
		t.Fatalf("send: %v", err)
	}
	request, secondInvitation, err := s.ReplaceReferee(ctx, ReplacementInput{RequestID: request.ID, CandidateUserID: candidateID,
		RefereeName: "Second Referee", RefereeEmail: "second@example.com", RefereeRelationship: "Director",
		TokenHash: "token-two", ExpiresAt: deadline, RefereeLink: "https://example.test/two"})
	if err != nil {
		t.Fatalf("replace: %v", err)
	}
	if request.ActiveInvitationID == nil || *request.ActiveInvitationID != secondInvitation.ID {
		t.Fatalf("active invitation = %v", request.ActiveInvitationID)
	}
	history, err := s.ListInvitationsForCandidate(ctx, request.ID, candidateID)
	if err != nil || len(history) != 2 || history[1].ID != firstInvitation.ID || history[1].SupersededAt == nil {
		t.Fatalf("history = %#v, %v", history, err)
	}
	if _, err := s.ListInvitationsForCandidate(ctx, request.ID, otherID); err != nil {
		t.Fatalf("cross-owner history query: %v", err)
	}

	var notificationID uuid.UUID
	err = pool.QueryRow(ctx, `SELECT id FROM notification_outbox
		WHERE referee_invitation_id=$1 AND notification_type='invitation_email'`, secondInvitation.ID).Scan(&notificationID)
	if err != nil {
		t.Fatalf("find invitation notification: %v", err)
	}
	if err := s.MarkNotificationSent(ctx, notificationID, "provider-message-two"); err != nil {
		t.Fatalf("mark notification sent: %v", err)
	}
	for attempt := 0; attempt < 2; attempt++ {
		if err := s.MarkInvitationDeliveredByProviderID(ctx, "provider-message-two"); err != nil {
			t.Fatalf("mark invitation delivered attempt %d: %v", attempt+1, err)
		}
	}
	request, err = s.GetReferenceRequestByIDForCandidate(ctx, request.ID, candidateID)
	if err != nil || request.Status != "delivered" {
		t.Fatalf("delivered request = %#v, %v", request, err)
	}

	view, err := s.DecideRefereeInvitationByTokenHash(ctx, RefereeDecisionInput{TokenHash: "token-two", Decision: "accepted"})
	if err != nil || view.Status != "accepted" {
		t.Fatalf("accepted invitation = %#v, %v", view, err)
	}
	for attempt := 0; attempt < 2; attempt++ {
		view, err = s.MarkRefereeInProgress(ctx, "token-two")
		if err != nil || view.Status != "in_progress" || view.InProgressAt == nil {
			t.Fatalf("in-progress attempt %d = %#v, %v", attempt+1, view, err)
		}
	}
}
