CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE reference_requests (
    id UUID PRIMARY KEY,
    candidate_user_id UUID NOT NULL REFERENCES users(id),
    active_invitation_id UUID,
    referee_name TEXT NOT NULL,
    referee_email TEXT NOT NULL,
    referee_relationship TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    programme_name TEXT NOT NULL,
    opportunity_type TEXT NOT NULL,
    deadline_at TIMESTAMPTZ NOT NULL,
    instructions TEXT NOT NULL,
    confidentiality_mode TEXT NOT NULL,
    organization TEXT NOT NULL,
    role TEXT NOT NULL,
    country_code TEXT NOT NULL,
    application_type TEXT NOT NULL,
    submission_method TEXT NOT NULL,
    preferred_completion_at TIMESTAMPTZ,
    timezone TEXT NOT NULL,
    candidate_context TEXT NOT NULL,
    why_applying TEXT NOT NULL,
    relationship_context TEXT NOT NULL,
    traits TEXT NOT NULL,
    achievements TEXT NOT NULL,
    outcome TEXT,
    outcome_note TEXT,
    outcome_at TIMESTAMPTZ,
    status TEXT NOT NULL,
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE supporting_documents (
    id UUID PRIMARY KEY,
    reference_request_id UUID NOT NULL REFERENCES reference_requests(id),
    candidate_user_id UUID NOT NULL REFERENCES users(id),
    storage_key TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    safe_filename TEXT NOT NULL,
    file_extension TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE referee_invitations (
    id UUID PRIMARY KEY,
    reference_request_id UUID NOT NULL REFERENCES reference_requests(id),
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    decision TEXT,
    decided_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    referee_name TEXT NOT NULL,
    referee_email TEXT NOT NULL,
    referee_relationship TEXT NOT NULL,
    delivered_at TIMESTAMPTZ,
    in_progress_at TIMESTAMPTZ,
    superseded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE reference_requests
    ADD CONSTRAINT reference_requests_active_invitation_fk
    FOREIGN KEY (active_invitation_id) REFERENCES referee_invitations(id);

CREATE UNIQUE INDEX referee_invitations_one_active_idx
    ON referee_invitations (reference_request_id)
    WHERE revoked_at IS NULL AND superseded_at IS NULL;

CREATE TABLE referee_contacts (
    id UUID PRIMARY KEY,
    candidate_user_id UUID NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    relationship TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    UNIQUE (candidate_user_id, email)
);

CREATE TABLE submitted_references (
    id UUID PRIMARY KEY,
    reference_request_id UUID NOT NULL UNIQUE REFERENCES reference_requests(id),
    referee_invitation_id UUID NOT NULL UNIQUE REFERENCES referee_invitations(id),
    storage_key TEXT NOT NULL UNIQUE,
    original_filename TEXT NOT NULL,
    safe_filename TEXT NOT NULL,
    file_extension TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE notification_outbox (
    id UUID PRIMARY KEY,
    reference_request_id UUID REFERENCES reference_requests(id),
    referee_invitation_id UUID REFERENCES referee_invitations(id),
    notification_type TEXT NOT NULL,
    channel TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
    status TEXT NOT NULL,
    attempt_count INTEGER NOT NULL,
    max_attempts INTEGER NOT NULL,
    available_at TIMESTAMPTZ NOT NULL,
    provider_message_id TEXT,
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
