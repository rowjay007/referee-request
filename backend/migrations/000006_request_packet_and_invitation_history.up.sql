ALTER TABLE reference_requests
    ADD COLUMN active_invitation_id UUID,
    ADD COLUMN confidentiality_mode TEXT NOT NULL DEFAULT 'confidential'
        CHECK (confidentiality_mode IN ('confidential', 'non_confidential')),
    ADD COLUMN organization TEXT NOT NULL DEFAULT '',
    ADD COLUMN role TEXT NOT NULL DEFAULT '',
    ADD COLUMN country_code TEXT NOT NULL DEFAULT '',
    ADD COLUMN application_type TEXT NOT NULL DEFAULT '',
    ADD COLUMN submission_method TEXT NOT NULL DEFAULT '',
    ADD COLUMN preferred_completion_at TIMESTAMPTZ,
    ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC',
    ADD COLUMN candidate_context TEXT NOT NULL DEFAULT '',
    ADD COLUMN why_applying TEXT NOT NULL DEFAULT '',
    ADD COLUMN relationship_context TEXT NOT NULL DEFAULT '',
    ADD COLUMN traits TEXT NOT NULL DEFAULT '',
    ADD COLUMN achievements TEXT NOT NULL DEFAULT '',
    ADD COLUMN outcome TEXT CHECK (outcome IN ('successful', 'unsuccessful', 'withdrawn', 'unknown')),
    ADD COLUMN outcome_note TEXT,
    ADD COLUMN outcome_at TIMESTAMPTZ;

UPDATE reference_requests
SET organization = institution_name,
    role = programme_name,
    application_type = opportunity_type,
    preferred_completion_at = deadline_at,
    candidate_context = instructions,
    relationship_context = referee_relationship;

ALTER TABLE reference_requests
    DROP CONSTRAINT IF EXISTS reference_requests_status_check;

ALTER TABLE reference_requests
    ADD CONSTRAINT reference_requests_status_check
    CHECK (status IN ('draft', 'sent', 'delivered', 'opened', 'accepted', 'in_progress', 'declined', 'submitted', 'cancelled', 'expired'));

ALTER TABLE referee_invitations
    DROP CONSTRAINT IF EXISTS referee_invitations_reference_request_id_key;

ALTER TABLE referee_invitations
    ADD COLUMN referee_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN referee_email TEXT NOT NULL DEFAULT '',
    ADD COLUMN referee_relationship TEXT NOT NULL DEFAULT '',
    ADD COLUMN delivered_at TIMESTAMPTZ,
    ADD COLUMN in_progress_at TIMESTAMPTZ,
    ADD COLUMN superseded_at TIMESTAMPTZ;

UPDATE referee_invitations ri
SET referee_name = r.referee_name,
    referee_email = r.referee_email,
    referee_relationship = r.referee_relationship
FROM reference_requests r
WHERE r.id = ri.reference_request_id;

UPDATE reference_requests r
SET active_invitation_id = ri.id
FROM referee_invitations ri
WHERE ri.reference_request_id = r.id
  AND ri.revoked_at IS NULL;

ALTER TABLE reference_requests
    ADD CONSTRAINT reference_requests_active_invitation_fk
    FOREIGN KEY (active_invitation_id) REFERENCES referee_invitations(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX referee_invitations_one_active_idx
    ON referee_invitations (reference_request_id)
    WHERE revoked_at IS NULL AND superseded_at IS NULL;

CREATE INDEX referee_invitations_request_history_idx
    ON referee_invitations (reference_request_id, created_at DESC);

ALTER TABLE notification_outbox
    ADD COLUMN referee_invitation_id UUID REFERENCES referee_invitations(id) ON DELETE SET NULL,
    ADD COLUMN delivered_at TIMESTAMPTZ;

UPDATE notification_outbox n
SET referee_invitation_id = r.active_invitation_id
FROM reference_requests r
WHERE n.reference_request_id = r.id
  AND n.notification_type IN ('invitation_email', 'manual_reminder', 'deadline_reminder');

CREATE UNIQUE INDEX notification_outbox_provider_message_idx
    ON notification_outbox (provider_message_id)
    WHERE provider_message_id IS NOT NULL;

CREATE TABLE referee_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    relationship TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (candidate_user_id, email)
);

CREATE INDEX referee_contacts_candidate_idx
    ON referee_contacts (candidate_user_id, name, created_at DESC);

INSERT INTO referee_contacts (candidate_user_id, name, email, relationship)
SELECT DISTINCT ON (candidate_user_id, lower(referee_email))
    candidate_user_id, referee_name, lower(referee_email), referee_relationship
FROM reference_requests
ORDER BY candidate_user_id, lower(referee_email), updated_at DESC
ON CONFLICT (candidate_user_id, email) DO NOTHING;