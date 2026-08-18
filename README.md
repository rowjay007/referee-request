# RefereeRequest

RefereeRequest is a modular monolith SaaS that helps candidates request and manage references while keeping the referee flow accountless and fast.

## Monorepo layout

- `frontend/` Next.js 16 App Router application
- `backend/` Go + Chi REST API (`/api/v1`)
- `backend/migrations/` PostgreSQL schema migrations
- `backend/sql/` sqlc query definitions
- `openapi/` API contract

## Local development

### Prerequisites

- Node.js 20.9+
- Go 1.23+
- PostgreSQL 16+

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
cp .env.example .env
go run ./cmd/api
```

## Validation

```bash
cd frontend && npm run lint && npm run build
cd backend && go test ./...
```

## Phase 2 endpoints

- `POST /api/v1/requests`
- `GET /api/v1/requests`
- `GET /api/v1/requests/{requestId}`
- `POST /api/v1/requests/{requestId}/documents`
- `GET /api/v1/requests/{requestId}/documents`
- `POST /api/v1/requests/{requestId}/send`

## Phase 3 referee endpoints

- `GET /api/v1/referee/{token}`
- `GET /api/v1/referee/{token}/documents/{documentId}`
- `POST /api/v1/referee/{token}/submit`

## Phase 4 notification endpoints

- `POST /api/v1/internal/notifications/reminders`
- `POST /api/v1/internal/notifications/dispatch`

## Readiness endpoint

- `GET /api/v1/health/ready`

## Environment model

- `dev` branch deploys to staging infrastructure and staging Supabase
- `main` branch deploys to production infrastructure and production Supabase
- staging and production credentials must remain isolated

## Deployment secrets

Set these GitHub repository secrets for staging automation:

- `STAGING_DATABASE_URL`
- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_ANON_KEY`
- `STAGING_SUPABASE_SERVICE_ROLE_KEY`
- `STAGING_SUPABASE_PROJECT_ID`
- `STAGING_API_BASE_URL`
- `RENDER_STAGING_DEPLOY_HOOK`
- `STAGING_NOTIFICATION_DISPATCH_TOKEN`

Set these GitHub repository secrets for production automation:

- `PRODUCTION_DATABASE_URL`
- `PRODUCTION_API_BASE_URL`
- `RENDER_PRODUCTION_DEPLOY_HOOK`

Set Render environment values:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (use `onboarding@resend.dev` for staging tests)
- `NOTIFICATION_DISPATCH_TOKEN`

Set backend Supabase environment values (for Google auth):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Set frontend environment values:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
