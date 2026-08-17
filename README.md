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

## Environment model

- `dev` branch deploys to staging infrastructure and staging Supabase
- `main` branch deploys to production infrastructure and production Supabase
- staging and production credentials must remain isolated
# referee-request
