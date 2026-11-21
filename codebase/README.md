# LedgerGuard

**Dynamic Multi-Tenant Zero-Knowledge Billing Engine** (MERN, TypeScript monorepo)

Company A and Company B use the platform at the same time. The API gateway verifies an
asymmetric (RS256) JWT, reads the tenant from the **verified claims**, and selects that tenant's
isolated MongoDB database. Week 2 adds an idempotent ledger: Redis locks, a unique-index duplicate
guard and MongoDB multi-document transactions. Later weeks add analytics and RSA payload signing.

## Status

| Week | Scope                                                           | State       |
| ---- | --------------------------------------------------------------- | ----------- |
| 1    | API gateway + JWT, tenant DB switching, login + dashboard shell | Done        |
| 2    | Redis locks, idempotent ledger, MongoDB transactions, ledger UI | In progress |
| 3    | Analytics aggregation + Chart.js dashboard                      | Planned     |
| 4    | RSA-256 endpoint hardening, deployment, polish                  | Planned     |

## Repository layout

```
LedgerGuard/
├── backend/      Express + TypeScript API (auth, tenants, database, health, tests)
├── frontend/     React + Vite + Tailwind client
├── shared/       Dependency-free API contracts (types + runtime guards)
├── docs/         Architecture, API contracts, ledger flow, Redis locking, weekly progress
├── docker-compose.yml   MongoDB single-node replica set (rs0) + Redis for local dev and tests
└── .github/      CI workflow + PR template
```

## Tech stack

React, TypeScript, Vite, Tailwind CSS, React Router, Axios, TanStack Query, React Hot Toast,
Node.js, Express, MongoDB, Mongoose, Redis (ioredis), JWT (RS256), bcrypt, Zod, Jest, Supertest,
Docker Compose, ESLint, Prettier, GitHub Actions.

## Getting started

Requirements: Node.js 20+ and Docker (MongoDB replica set and Redis run from `docker-compose.yml`).

```bash
# 0. Infrastructure (repo root): MongoDB replica set rs0 + Redis
docker compose up -d --wait

# 1. Backend
cd backend
cp .env.example .env      # set MONGODB_MASTER_URI and REDIS_URL (see docker-compose.yml)
npm install
npm run keys:generate     # creates keys/private.pem + keys/public.pem (git-ignored)
npm run dev               # http://localhost:8000

# 2. Frontend (once frontend/ exists)
cd frontend
npm install
npm run dev               # http://localhost:5173

# 3. Repo-wide formatting tools (optional, from repo root)
npm install
npm run format
```

### Demo accounts (Week 1, seeded; not for production)

| Email                | Password (`SEED_USER_PASSWORD`) | Tenant      |
| -------------------- | ------------------------------- | ----------- |
| `admin@companyA.com` | `password123`                   | `company_A` |
| `admin@companyB.com` | `password123`                   | `company_B` |

## Backend scripts

| Command                    | Purpose                                                               |
| -------------------------- | --------------------------------------------------------------------- |
| `npm run dev`              | Start with hot reload                                                 |
| `npm run typecheck`        | Strict TypeScript check (no emit)                                     |
| `npm run lint`             | ESLint (`any` and `@ts-ignore` are errors)                            |
| `npm run test:unit`        | Week 1 unit tests. No Docker needed                                   |
| `npm run test:integration` | Ledger, idempotency, transactions, concurrency. Needs Docker services |
| `npm test`                 | Both projects (needs Docker services)                                 |
| `npm run test:ci`          | Same, with coverage                                                   |
| `npm run build`            | Compile to `dist/` (tests excluded)                                   |
| `npm run keys:generate`    | Create a local RSA key pair                                           |

Tests generate throw-away RSA keys in memory, so they need no `.env`. Unit tests need no database.
Integration tests need the Docker services and use Redis database 15 plus their own MongoDB
databases; they refuse to touch Redis database 0.

## API

| Method | Path                              | Auth | Description                                    |
| ------ | --------------------------------- | ---- | ---------------------------------------------- |
| GET    | `/health`                         | no   | Liveness check                                 |
| POST   | `/api/v1/auth/login`              | no   | Verify credentials, set cookie                 |
| POST   | `/api/v1/auth/logout`             | no   | Clear cookie                                   |
| GET    | `/api/v1/auth/me`                 | yes  | Current user                                   |
| GET    | `/api/v1/tenants/current`         | yes  | Resolved tenant + DB status (Person 2)         |
| POST   | `/api/v1/ledger/transactions`     | yes  | Create a transaction (needs `Idempotency-Key`) |
| GET    | `/api/v1/ledger/transactions`     | yes  | Paginated transaction history                  |
| GET    | `/api/v1/ledger/transactions/:id` | yes  | Transaction detail                             |
| GET    | `/api/v1/ledger/summary`          | yes  | Totals for the tenant                          |

Full request/response shapes: [`docs/api-contracts.md`](docs/api-contracts.md). The TypeScript
source of truth is [`shared/contracts/`](shared/contracts).

## Security model

- Token: RS256 JWT in an **HttpOnly, SameSite=Lax** cookie (`Secure` in production). `Authorization: Bearer` is also accepted.
- The server accepts **only** RS256, checks issuer and expiry, and validates the claim shape.
- `tenantId` comes **only** from verified claims, never from headers, query or body.
- Tenants are resolved through a trusted registry; a token can never supply a database URI.
- Duplicate billing is prevented in layers: Redis lock (coordination), MongoDB unique index
  (authoritative), MongoDB transaction (atomic debit + credit). Redis alone is never trusted.
- Retrying a request with the same `Idempotency-Key` returns the stored result, never a second payment.
- Login returns the same error for an unknown email and a wrong password.
- Private keys and `.env` files are git-ignored and CI fails if they are tracked.

## Contributing

Branching, ownership and PR rules are in [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Team

| Role                             | Owns                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Person 1 - Backend lead          | `backend/src/app.ts`, `server.ts`, `modules/auth/`, `modules/ledger/`, `modules/transactions/`          |
| Person 2 - Redis and database    | `backend/src/database/`, `modules/tenants/`, `services/` (Redis, locks, idempotency), `ledger.model.ts` |
| Person 3 - Frontend              | `frontend/`                                                                                             |
| Person 4 - Integration & quality | `shared/`, `backend/src/tests/`, `modules/health/`, `.github/`, `docs/`, root docs/config               |
