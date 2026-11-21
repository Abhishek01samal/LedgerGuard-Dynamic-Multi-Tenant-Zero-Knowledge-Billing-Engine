# Architecture

## Overview (Weeks 1 and 2)

```
React client (Person 3)
   |  HttpOnly cookie (RS256 JWT), Idempotency-Key on ledger writes
   v
Express API gateway (Person 1)
   |-- helmet, CORS, JSON parser, cookie parser
   |-- requireAuth: verify signature, expiry, issuer, claim shape
   |        -> req.auth = { sub, email, tenantId, role }
   v
getTenantContext(req) -> { tenantId, userId }
   |
   |   POST /api/v1/ledger/transactions
   v
Idempotency middleware (Person 2)
   |-- header present and equal to body eventId
   |-- Redis lock  lock:ledger:{tenantId}:{eventId}   (SET NX PX, token owned)
   |-- durable lookup (tenantId, eventId): replay / 409 / continue
   v
Ledger service (Person 1)
   |-- MongoDB session + transaction on the tenant connection
   |-- debit entry + credit entry + transaction record, commit or abort
   v
Tenant connection manager (Person 2)
   |-- trusted tenant registry (never a URI from the token)
   |-- cached, reusable connection per tenant
   v
company_A database      company_B database       Redis (shared coordination, tenant-scoped keys)
```

## Request flow (auth and tenant)

1. `POST /api/v1/auth/login` verifies credentials (bcrypt) and signs an RS256 JWT containing
   `sub`, `email`, `tenantId`, `role`.
2. The token is set as an HttpOnly cookie; the body contains only the user object.
3. Protected routes pass through `requireAuth`, which accepts only RS256, checks issuer and expiry,
   and validates the claims with Zod.
4. Tenant-scoped code calls `getTenantContext(req)` and then `getTenantConnection(tenantId)`.
5. The connection manager resolves `tenantId` in the registry and returns the isolated connection.

## Ledger architecture (Week 2)

Full walkthrough with the decision table and failure scenarios: [`ledger-flow.md`](ledger-flow.md).
Lock details and the Redis outage policy: [`redis-locking.md`](redis-locking.md).

| Protection          | Where                              | Job                                        | Authoritative |
| ------------------- | ---------------------------------- | ------------------------------------------ | ------------- |
| Redis lock          | `services/lock.service.ts`         | Serialise the same event under normal load | No            |
| Unique index        | `modules/ledger/ledger.model.ts`   | One record per (tenant, eventId)           | **Yes**       |
| MongoDB transaction | `modules/ledger/ledger.service.ts` | Debit and credit commit together           | **Yes**       |

Design rules:

- Redis is coordination. If Redis is lost, correctness still holds (index + transaction), at worst
  with a `503` while the lock cannot be taken.
- Transactions need a replica set. Local dev and CI use the single-node set `rs0` from
  `docker-compose.yml`.
- A response can be lost after a commit. The durable record is returned on retry with the same key.
- Money is an integer (minor units) or Decimal128. Never a float.
- Tenant ids are part of every lock key and every unique index, so tenants cannot collide.

## Isolation guarantees

- The tenant is derived from a verified signature, so a client cannot choose another tenant.
- `X-Tenant-Id`, query and body values are ignored (covered by `tenant.test.ts` and
  `ledger.test.ts`).
- Tampering with a token payload invalidates the signature (401).
- Another tenant's transaction id answers 404, never 403 (no probing).
- The same `eventId` may exist in two tenants (`idempotency.test.ts`).
- Interleaved Company A / Company B load never mixes data (`concurrency.test.ts`).
- Unknown tenants are rejected by the registry (Person 2 test, pending).

## Test environment

```
docker compose up -d --wait          MongoDB rs0 (27017) + Redis (6379)
backend/src/tests/helpers/           global-setup checks both, points the app at them
Redis database 15                    tests only; database 0 is refused
```

CI starts the same compose file, runs unit and integration tests, and uploads the Jest JSON report.

## Error format

```json
{ "success": false, "message": "Invalid token", "code": "INVALID_TOKEN" }
```

Validation errors add `errors: [{ path, message }]`. Ledger codes are listed in
[`api-contracts.md`](api-contracts.md).

## Week 3 hooks

The ledger records are append-only per tenant with `createdAt`, `amount`, `currency` and `status`,
so Week 3 aggregation pipelines (usage and cost per period) can read them without schema changes.
