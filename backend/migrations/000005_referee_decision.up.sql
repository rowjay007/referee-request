ALTER TABLE reference_requests
    DROP CONSTRAINT IF EXISTS reference_requests_status_check;

ALTER TABLE reference_requests
    ADD CONSTRAINT reference_requests_status_check
    CHECK (status IN ('draft', 'sent', 'opened', 'accepted', 'declined', 'submitted', 'cancelled', 'expired'));

ALTER TABLE referee_invitations
    ADD COLUMN decision TEXT CHECK (decision IN ('accepted', 'declined')),
    ADD COLUMN decided_at TIMESTAMPTZ;

CREATE INDEX referee_invitations_decision_idx
    ON referee_invitations (decision, decided_at);
