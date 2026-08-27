DROP TABLE IF EXISTS referee_contacts;

DROP INDEX IF EXISTS notification_outbox_provider_message_idx;
ALTER TABLE notification_outbox
    DROP COLUMN IF EXISTS delivered_at,
    DROP COLUMN IF EXISTS referee_invitation_id;

ALTER TABLE reference_requests
    DROP CONSTRAINT IF EXISTS reference_requests_active_invitation_fk;

DROP INDEX IF EXISTS referee_invitations_request_history_idx;
DROP INDEX IF EXISTS referee_invitations_one_active_idx;

DELETE FROM referee_invitations
WHERE superseded_at IS NOT NULL;

ALTER TABLE referee_invitations
    DROP COLUMN IF EXISTS superseded_at,
    DROP COLUMN IF EXISTS in_progress_at,
    DROP COLUMN IF EXISTS delivered_at,
    DROP COLUMN IF EXISTS referee_relationship,
    DROP COLUMN IF EXISTS referee_email,
    DROP COLUMN IF EXISTS referee_name;

ALTER TABLE referee_invitations
    ADD CONSTRAINT referee_invitations_reference_request_id_key UNIQUE (reference_request_id);

ALTER TABLE reference_requests
    DROP CONSTRAINT IF EXISTS reference_requests_status_check;

UPDATE reference_requests
SET status = CASE status
    WHEN 'delivered' THEN 'sent'
    WHEN 'in_progress' THEN 'accepted'
    ELSE status
END;

ALTER TABLE reference_requests
    ADD CONSTRAINT reference_requests_status_check
    CHECK (status IN ('draft', 'sent', 'opened', 'accepted', 'declined', 'submitted', 'cancelled', 'expired'));

ALTER TABLE reference_requests
    DROP COLUMN IF EXISTS outcome_at,
    DROP COLUMN IF EXISTS outcome_note,
    DROP COLUMN IF EXISTS outcome,
    DROP COLUMN IF EXISTS achievements,
    DROP COLUMN IF EXISTS traits,
    DROP COLUMN IF EXISTS relationship_context,
    DROP COLUMN IF EXISTS why_applying,
    DROP COLUMN IF EXISTS candidate_context,
    DROP COLUMN IF EXISTS timezone,
    DROP COLUMN IF EXISTS preferred_completion_at,
    DROP COLUMN IF EXISTS submission_method,
    DROP COLUMN IF EXISTS application_type,
    DROP COLUMN IF EXISTS country_code,
    DROP COLUMN IF EXISTS role,
    DROP COLUMN IF EXISTS organization,
    DROP COLUMN IF EXISTS confidentiality_mode,
    DROP COLUMN IF EXISTS active_invitation_id;