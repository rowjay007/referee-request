-- name: CreateReferenceRequest :one
INSERT INTO reference_requests (
    candidate_user_id, referee_name, referee_email, referee_relationship,
    institution_name, programme_name, opportunity_type, deadline_at, instructions, status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft'
)
RETURNING *;

-- name: ListReferenceRequestsByCandidate :many
SELECT *
FROM reference_requests
WHERE candidate_user_id = $1
ORDER BY created_at DESC;

-- name: GetReferenceRequestByIDForCandidate :one
SELECT *
FROM reference_requests
WHERE id = $1 AND candidate_user_id = $2
LIMIT 1;

-- name: MarkReferenceRequestSent :one
UPDATE reference_requests
SET status = 'sent', sent_at = NOW(), updated_at = NOW()
WHERE id = $1 AND candidate_user_id = $2 AND status = 'draft'
RETURNING *;

-- name: CreateSupportingDocument :one
INSERT INTO supporting_documents (
    reference_request_id, candidate_user_id, storage_key, original_filename,
    safe_filename, file_extension, content_type, size_bytes
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;
