DROP INDEX IF EXISTS referee_invitations_decision_idx;

ALTER TABLE referee_invitations
    DROP COLUMN IF EXISTS decided_at,
    DROP COLUMN IF EXISTS decision;

ALTER TABLE reference_requests
    DROP CONSTRAINT IF EXISTS reference_requests_status_check;

ALTER TABLE reference_requests
    ADD CONSTRAINT reference_requests_status_check
    CHECK (status IN ('draft', 'sent', 'opened', 'submitted', 'cancelled', 'expired'));
