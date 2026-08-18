CREATE TABLE reference_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referee_name TEXT NOT NULL,
    referee_email TEXT NOT NULL,
    referee_relationship TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    programme_name TEXT NOT NULL,
    opportunity_type TEXT NOT NULL,
    deadline_at TIMESTAMPTZ NOT NULL,
    instructions TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'opened', 'submitted', 'cancelled', 'expired')),
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX reference_requests_candidate_user_idx
    ON reference_requests (candidate_user_id, created_at DESC);

CREATE INDEX reference_requests_status_idx
    ON reference_requests (status, deadline_at);

CREATE TABLE supporting_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_request_id UUID NOT NULL REFERENCES reference_requests(id) ON DELETE CASCADE,
    candidate_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL UNIQUE,
    original_filename TEXT NOT NULL,
    safe_filename TEXT NOT NULL,
    file_extension TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX supporting_documents_request_idx
    ON supporting_documents (reference_request_id, created_at ASC);

CREATE TABLE reference_request_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_request_id UUID NOT NULL REFERENCES reference_requests(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX reference_request_events_request_idx
    ON reference_request_events (reference_request_id, created_at DESC);
