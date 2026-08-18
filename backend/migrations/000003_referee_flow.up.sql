CREATE TABLE referee_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_request_id UUID NOT NULL UNIQUE REFERENCES reference_requests(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX referee_invitations_expires_idx
    ON referee_invitations (expires_at);

CREATE TABLE submitted_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_request_id UUID NOT NULL UNIQUE REFERENCES reference_requests(id) ON DELETE CASCADE,
    referee_invitation_id UUID NOT NULL UNIQUE REFERENCES referee_invitations(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL UNIQUE,
    original_filename TEXT NOT NULL,
    safe_filename TEXT NOT NULL,
    file_extension TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
