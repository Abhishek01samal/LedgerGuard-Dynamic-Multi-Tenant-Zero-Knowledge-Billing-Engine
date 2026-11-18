# LedgerGuard

**Dynamic Multi-Tenant Zero-Knowledge Billing Engine** (MERN, TypeScript monorepo)

Company A and Company B use the platform at the same time. The API gateway verifies an
asymmetric (RS256) JWT, reads the tenant from the **verified claims**, and selects that tenant's
isolated MongoDB database. Later weeks add Redis locks, ACID ledger transactions, analytics and
RSA payload signing.

## Status

| Week | Scope                                                           | State       |
| ---- | --------------------------------------------------------------- | ----------- |
| 1    | API gateway + JWT, tenant DB switching, login + dashboard shell | Completed   |
| 2    | Redis locks, idempotent ledger, MongoDB transactions, ledger UI | Planned     |
| 3    | Analytics aggregation + Chart.js dashboard                      | Planned     |
| 4    | RSA-256 endpoint hardening, deployment, polish                  | Planned     |

## Repository layout

```
LedgerGuard/
├── backend/        Express + TypeScript API (auth, tenants, database, health, tests)
├── frontend/       React + Vite + Tailwind client
├── shared/         Dependency-free API contracts (types + runtime guards)
├── docs/           Architecture, API contracts, weekly progress
├── documentation/  Frontend implementation reports & plans
└── .github/        CI workflow + PR template
```

## Tech stack

React, TypeScript, Vite, Tailwind CSS, React Router, Axios, Node.js, Express, MongoDB, Mongoose,
JWT (RS256), bcrypt, Zod, Jest, Supertest, ESLint, Prettier, GitHub Actions.

## Getting started

Requirements: Node.js 20+, MongoDB running locally (needed once the tenant layer is connected).

```bash
# 1. Backend
cd backend
cp .env.example .env
npm install
npm run keys:generate     # creates keys/private.pem + keys/public.pem (git-ignored)
npm run dev               # http://localhost:8000

# 2. Frontend
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

| Command                 | Purpose                                    |
| ----------------------- | ------------------------------------------ |
| `npm run dev`           | Start with hot reload                      |
| `npm run typecheck`     | Strict TypeScript check (no emit)          |
| `npm run lint`          | ESLint (`any` and `@ts-ignore` are errors) |
| `npm test`              | Jest + Supertest                           |
| `npm run test:ci`       | Same, with CI mode                         |
| `npm run build`         | Compile to `dist/` (tests excluded)        |
| `npm run keys:generate` | Create a local RSA key pair                |

Tests generate throw-away RSA keys in memory, so they need no `.env` and no MongoDB.

## Frontend scripts

| Command            | Purpose                   |
| ------------------ | ------------------------- |
| `npm run dev`      | Start Vite dev server     |
| `npm run build`    | TypeScript check + build  |
| `npm run lint`     | Oxlint linter             |
| `npm run preview`  | Preview production build  |

## API (Week 1)

| Method | Path                      | Auth | Description                            |
| ------ | ------------------------- | ---- | -------------------------------------- |
| GET    | `/health`                 | no   | Liveness check                         |
| POST   | `/api/v1/auth/login`      | no   | Verify credentials, set cookie         |
| POST   | `/api/v1/auth/logout`     | no   | Clear cookie                           |
| GET    | `/api/v1/auth/me`         | yes  | Current user                           |
| GET    | `/api/v1/tenants/current` | yes  | Resolved tenant + DB status (Person 2) |

Full request/response shapes: [`docs/api-contracts.md`](docs/api-contracts.md). The TypeScript
source of truth is [`shared/contracts/`](shared/contracts).

## Security model

- Token: RS256 JWT in an **HttpOnly, SameSite=Lax** cookie (`Secure` in production). `Authorization: Bearer` is also accepted.
- The server accepts **only** RS256, checks issuer and expiry, and validates the claim shape.
- `tenantId` comes **only** from verified claims, never from headers, query or body.
- Tenants are resolved through a trusted registry; a token can never supply a database URI.
- Login returns the same error for an unknown email and a wrong password.
- Private keys and `.env` files are git-ignored and CI fails if they are tracked.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

