# RefereeRequest API

Go + Chi REST API for RefereeRequest.

## Run

```bash
cp .env.example .env
go run ./cmd/api
```

For Render, either use `go build -o referee-request-api ./cmd/api` as the build command and `./referee-request-api` as the start command, or configure the service to use `backend/Dockerfile`. The service honors Render's `PORT` variable automatically. Set `OTEL_EXPORTER=stdout` for basic trace output or `OTEL_EXPORTER=none` when no trace exporter is configured.

## Migrations

Migration files are in `migrations/`.
CI workflows run `migrate up` automatically on `dev` (staging) and `main` (production) before deploy.

## API base

`/api/v1`

## Candidate request endpoints

- `DELETE /api/v1/account` (deletes the authenticated candidate account and private documents)

- `POST /api/v1/requests`
- `GET /api/v1/requests`
- `GET /api/v1/requests/{requestId}`
- `POST /api/v1/requests/{requestId}/documents`
- `GET /api/v1/requests/{requestId}/documents`
- `POST /api/v1/requests/{requestId}/send`
- `PATCH /api/v1/requests/{requestId}` (draft only; requires `updatedAt`)
- `POST /api/v1/requests/{requestId}/replace-referee`
- `POST /api/v1/requests/{requestId}/repeat`
- `PUT /api/v1/requests/{requestId}/outcome`
- `GET /api/v1/requests/{requestId}/invitations`
- `GET /api/v1/requests/{requestId}/submitted-reference` (non-confidential only)
- `GET|POST /api/v1/referee-contacts`
- `PUT|DELETE /api/v1/referee-contacts/{contactId}`

## Referee endpoints

- `GET /api/v1/referee/{token}`
- `GET /api/v1/referee/{token}/documents/{documentId}`
- `POST /api/v1/referee/{token}/submit`
- `POST /api/v1/referee/{token}/in-progress`

## Internal notification endpoints

- `POST /api/v1/internal/notifications/reminders`
- `POST /api/v1/internal/notifications/dispatch`
- `POST /api/v1/internal/notifications/delivery/{providerMessageId}`

Notification processing now runs in-process on the backend when `NOTIFICATION_WORKER_ENABLED=true`.
Use internal endpoints only for manual/admin dispatch control.

## Storage

Development defaults to `STORAGE_PROVIDER=local` and `STORAGE_LOCAL_ROOT=./tmp/storage`.
Production requires private Supabase Storage configured with:

- `STORAGE_PROVIDER=supabase`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (backend only; never expose it to clients)
- `STORAGE_SUPABASE_BUCKET` (defaults to `reference-documents`)

## Social auth endpoint

- `POST /api/v1/auth/google`

## Readiness endpoint

- `GET /api/v1/health/ready`
