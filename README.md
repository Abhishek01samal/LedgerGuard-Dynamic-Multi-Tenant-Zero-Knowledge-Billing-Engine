# LedgerGuard

Dynamic multi-tenant billing engine with JWT RS256 authentication, tenant-isolated MongoDB ledgers, Redis idempotency locks, analytics, RSA receipt signatures, and a React operations dashboard.

## Problem

SaaS billing systems often mix tenant data, double-charge on retries, and lose money on partial ledger writes. LedgerGuard keeps each company in its own database, treats MongoDB as the source of truth for duplicates, and only counts completed transactions as expenditure.

## Key features

- JWT RS256 login with tenant identity taken only from the verified token
- Per-tenant MongoDB databases (`tenant_company_A`, `tenant_company_B`)
- Idempotent billing (`Idempotency-Key` must match `eventId`)
- Atomic double-entry ledger (debit + credit in one MongoDB transaction)
- Redis distributed lock with in-process fallback
- Historical analytics via aggregation pipelines (UTC, one currency at a time)
- Monthly usage limits (default ₹5,000 / 500000 paise)
- RSA-SHA256 transaction receipts and optional request signatures
- Tenant-scoped audit events with secret redaction

## Technology stack

Backend: Node.js, Express, TypeScript, MongoDB/Mongoose, Redis, Zod, Winston, Jest  
Frontend: React, Vite, Tailwind CSS, TanStack Query, Chart.js, Axios  
Ops: Docker, Docker Compose, GitHub Actions

## Demo users

| Email | Tenant | Password |
|---|---|---|
| admin@companya.com | company_A | password123 |
| admin@companyb.com | company_B | password123 |

## Local setup

### Demo mode (current default)

No Docker, MongoDB, or Redis required:

```bash
npm install
npm run dev
```

UI: http://localhost:5173. Sign in with either demo user above. The dashboard, ledger, analytics, and billing flow use seeded dummy data stored in the browser (tenant-isolated). Set `VITE_USE_MOCK_DATA=false` in `frontend/.env` to switch back to the real API.

The API also starts on http://localhost:8000 (`GET /health`) without Redis; it uses an in-process lock until Redis is enabled later.

### Real infrastructure (later)

1. Start MongoDB replica set and Redis:

```bash
docker compose up -d mongo redis
```

2. Backend:

```bash
cd backend
cp .env.example .env
npm install
npm run keys:generate
npm run dev
```

3. Frontend (set `VITE_USE_MOCK_DATA=false`):

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

MongoDB transactions need a replica set. The compose file initiates `rs0`. Uncomment `REDIS_URL` in `backend/.env` when Redis is running.

## Environment

Never put real secrets in `.env.example` or the README. Production keys belong in the host secret manager. Vite `VITE_*` values are public; never put private keys there.

## API (authenticated unless noted)

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/ledger/transactions` (header `Idempotency-Key`)
- `GET /api/v1/ledger/transactions`
- `GET /api/v1/ledger/transactions/:id`
- `GET /api/v1/ledger/summary`
- `GET /api/v1/analytics/summary`
- `GET /api/v1/analytics/expenditure`
- `GET /api/v1/analytics/usage`
- `GET /api/v1/analytics/transactions`
- `GET /api/v1/usage/limits`
- `GET /api/v1/security/receipt/:transactionId`
- `GET /api/v1/logs/events`

Money is stored as integer minor units. Dashboard charts convert paise/cents to major units for display.

## Testing

```bash
cd backend && npm test && npm run typecheck
cd frontend && npm run typecheck && npm run build
```

The same commands are available from the repository root as `npm test`, `npm run typecheck`, and `npm run build`.

Database-backed suites run only when `MONGO_TEST_URI` points at a replica set.

## Deployment

See `docs/deployment-guide.md`. Build images with `backend/Dockerfile` and `frontend/Dockerfile`. Supply `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` as environment values in production rather than committing PEM files.
