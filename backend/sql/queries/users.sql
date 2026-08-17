-- name: CreateUser :one
INSERT INTO users (email, full_name, password_hash)
VALUES ($1, $2, $3)
RETURNING id, email, full_name, password_hash, created_at, updated_at;

-- name: GetUserByEmail :one
SELECT id, email, full_name, password_hash, created_at, updated_at
FROM users
WHERE email = $1
LIMIT 1;
