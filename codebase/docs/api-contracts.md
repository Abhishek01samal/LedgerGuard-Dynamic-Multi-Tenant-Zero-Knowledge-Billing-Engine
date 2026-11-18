# API contracts

Proposed team contracts, not Infotact specifications. Source of truth in code:
`shared/contracts/`. Frontend calls must use `withCredentials: true`.

## POST /api/v1/auth/login

Request

```json
{ "email": "admin@companyA.com", "password": "password123" }
```

Response `200` (token is set as an HttpOnly cookie, never in the body)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_001",
      "email": "admin@companya.com",
      "tenantId": "company_A",
      "role": "admin"
    }
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`.

## GET /api/v1/auth/me

Response `200`: `{ "success": true, "data": { "user": { ... } } }`
Errors: `401 UNAUTHENTICATED | INVALID_TOKEN | TOKEN_EXPIRED`.

## POST /api/v1/auth/logout

Response `200`: `{ "success": true, "message": "Logged out" }`

## GET /api/v1/tenants/current (Person 2)

```json
{ "success": true, "data": { "tenantId": "company_A", "databaseStatus": "connected" } }
```

## GET /health

```json
{ "success": true, "message": "LedgerGuard API is running" }
```

## Error codes

| Code                  | Status | Meaning                     |
| --------------------- | ------ | --------------------------- |
| `VALIDATION_ERROR`    | 400    | Body failed validation      |
| `INVALID_CREDENTIALS` | 401    | Wrong email or password     |
| `UNAUTHENTICATED`     | 401    | No token supplied           |
| `INVALID_TOKEN`       | 401    | Bad signature/claims/issuer |
| `TOKEN_EXPIRED`       | 401    | Token past expiry           |
| `NOT_FOUND`           | 404    | Unknown route               |
| `INTERNAL_ERROR`      | 500    | Unexpected server error     |

Ledger error codes are listed in the Week 2 section below.

## Using contracts from the frontend

Import types from `shared/contracts/*` with a relative path or a Vite/TS path alias
(`@shared/*` -> `../shared/*`); they have no dependencies.

---

# Week 2: ledger contracts (frozen Day 1)

Proposed team contracts. Source of truth in code: `shared/contracts/ledger.contract.ts`
(routes, statuses, error codes and runtime type guards). Persons 1, 2 and 3 import from there; if
something must change, Person 4 changes the contract first and tags everyone.

All ledger routes require authentication (cookie or `Authorization: Bearer`). The tenant always
comes from the verified JWT, never from the request.

## Money

`amount` is a **positive integer**. Decimals, strings, zero and negative numbers are rejected with
`400 VALIDATION_ERROR`. `currency` is a 3-letter uppercase code. Open decision (Day 1 sync): whether
`1000` means INR 1,000.00 or INR 10.00 (minor units). Decide once and apply it everywhere.

## POST /api/v1/ledger/transactions

Headers

```
Authorization: Bearer <access-token>
Idempotency-Key: evt_companyA_001
Content-Type: application/json
```

Request

```json
{
  "eventId": "evt_companyA_001",
  "description": "Monthly subscription payment",
  "amount": 1000,
  "currency": "INR",
  "debitAccount": "customer_001",
  "creditAccount": "merchant_001"
}
```

Response `201` (first processing)

```json
{
  "success": true,
  "message": "Transaction completed",
  "data": {
    "transactionId": "txn_001",
    "eventId": "evt_companyA_001",
    "status": "COMPLETED",
    "amount": 1000,
    "currency": "INR"
  }
}
```

The debit and credit entries are committed in one MongoDB transaction: both or neither.

## GET /api/v1/ledger/transactions

`?page=1&limit=10` (defaults: page 1, limit 10). Newest first. Only the caller's tenant.

```json
{
  "success": true,
  "data": {
    "transactions": [],
    "pagination": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 }
  }
}
```

Each transaction has `transactionId`, `eventId`, `status`, `amount`, `currency`, `description`
and optionally `debitAccount`, `creditAccount`, `createdAt`.

## GET /api/v1/ledger/transactions/:id

`:id` is the `transactionId`. Response `200`:
`{ "success": true, "data": { ...transaction } }`.
An unknown id **or an id owned by another tenant** returns `404 TRANSACTION_NOT_FOUND` (never 403,
so ids cannot be probed across tenants).

## GET /api/v1/ledger/summary

```json
{
  "success": true,
  "data": {
    "totalTransactions": 120,
    "successfulTransactions": 110,
    "failedTransactions": 10,
    "totalAmount": 125000,
    "currency": "INR"
  }
}
```

`successfulTransactions` counts `COMPLETED`, `failedTransactions` counts `FAILED`.
`totalAmount` is the sum of `COMPLETED` transactions.

## Idempotency rules

The `Idempotency-Key` header is required and must equal `eventId` in the body.

| Situation                                    | Status | Code / behaviour                                           |
| -------------------------------------------- | ------ | ---------------------------------------------------------- |
| First time this key is seen                  | 201    | Process, store the durable result                          |
| Same key, same payload, original `COMPLETED` | 200    | Original result + header `Idempotent-Replayed: true`       |
| Same key, same payload, original `FAILED`    | 200    | Original failure is replayed; use a new key to start over  |
| Same key, different payload                  | 409    | `IDEMPOTENCY_CONFLICT`                                     |
| Same key, still processing                   | 409    | `REQUEST_IN_PROGRESS` + `Retry-After` header (retryable)   |
| Header missing                               | 400    | `IDEMPOTENCY_KEY_REQUIRED`                                 |
| Header differs from body `eventId`           | 400    | `IDEMPOTENCY_KEY_MISMATCH`                                 |
| Redis unavailable                            | 503    | `SERVICE_UNAVAILABLE` (fail closed) or safe DB-only result |
| Transaction rolled back                      | 500    | `TRANSACTION_FAILED`, no ledger entries exist              |

Rules behind the table:

- Never answer "completed" because a Redis key exists. The durable MongoDB record decides.
- The unique index (tenant + event id) is the authoritative duplicate guard. Redis is coordination.
- Two tenants may use the same `eventId`; they are independent.
- A client that lost the response retries with the **same** key and receives the original result.

## Error codes (ledger)

| Code                       | Status | Meaning                                  |
| -------------------------- | ------ | ---------------------------------------- |
| `VALIDATION_ERROR`         | 400    | Body or query failed validation          |
| `IDEMPOTENCY_KEY_REQUIRED` | 400    | No `Idempotency-Key` header              |
| `IDEMPOTENCY_KEY_MISMATCH` | 400    | Header and body `eventId` differ         |
| `TRANSACTION_NOT_FOUND`    | 404    | Unknown id or another tenant's id        |
| `IDEMPOTENCY_CONFLICT`     | 409    | Same key, different payload              |
| `REQUEST_IN_PROGRESS`      | 409    | Same key is being processed (retry)      |
| `TRANSACTION_FAILED`       | 500    | Ledger write rolled back                 |
| `SERVICE_UNAVAILABLE`      | 503    | A dependency (Redis) refused the request |

## Redis lock interface (Person 2 exports, Person 4 tests)

`backend/src/services/lock.service.ts` exports:

```ts
export interface Lock {
  key: string;
  token: string; // unique per acquisition
}
export function acquireLock(key: string, ttlMs: number): Promise<Lock | null>; // null = already held
export function releaseLock(lock: Lock): Promise<boolean>; // true only if the token still matched
```

Key convention: `lock:ledger:{tenantId}:{eventId}`. Details in `docs/redis-locking.md`.
