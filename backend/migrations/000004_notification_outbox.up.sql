CREATE TABLE notification_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_request_id UUID REFERENCES reference_requests(id) ON DELETE SET NULL,
    notification_type TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email')),
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'dead')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    provider_message_id TEXT,
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notification_outbox_dispatch_idx
    ON notification_outbox (status, available_at, created_at);

CREATE INDEX notification_outbox_reference_request_idx
    ON notification_outbox (reference_request_id, notification_type, created_at DESC);
