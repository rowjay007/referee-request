# RefereeRequest API

Go + Chi REST API for RefereeRequest.

## Run

```bash
cp .env.example .env
go run ./cmd/api
```

## Migrations

Migration files are in `migrations/`.

## API base

`/api/v1`

## Candidate request endpoints

- `POST /api/v1/requests`
- `GET /api/v1/requests`
- `GET /api/v1/requests/{requestId}`
- `POST /api/v1/requests/{requestId}/documents`
- `GET /api/v1/requests/{requestId}/documents`
- `POST /api/v1/requests/{requestId}/send`

## Referee endpoints

- `GET /api/v1/referee/{token}`
- `GET /api/v1/referee/{token}/documents/{documentId}`
- `POST /api/v1/referee/{token}/submit`

## Internal notification endpoints

- `POST /api/v1/internal/notifications/reminders`
- `POST /api/v1/internal/notifications/dispatch`
