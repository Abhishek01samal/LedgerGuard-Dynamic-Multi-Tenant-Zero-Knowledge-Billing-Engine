# Person 1 – Ledger Engine (Week 2)

Owner: Person 1 (Backend Lead). Branch: `feature/idempotent-ledger`.
This document is the hand-off for Person 2 (Redis/idempotency), Person 3 (UI) and Person 4 (tests).

## 1. What exists

```
backend/src/
├── middleware/error.middleware.ts      AppError now carries an optional safe `data` payload
├── config/env.ts                       + LEDGER_DEMO_FAIL_ACCOUNT (demo only, ignored in production)
├── modules/ledger/
│   ├── ledger.routes.ts                POST/GET transactions, GET :id, GET summary
│   ├── ledger.controller.ts            validates input, builds tenant context from the JWT
│   ├── ledger.service.ts               idempotent create, reads, summary, rollback handling
│   ├── ledger.validation.ts            Zod schemas (strict)
│   ├── ledger.types.ts                 persisted shapes + API shapes + IdempotencyGuard port
│   ├── ledger.mapper.ts                money <-> minor units, payload hash, DB doc -> API view
│   ├── ledger.errors.ts                LockUnavailableError, LedgerProcessingError, 409 helpers
│   ├── ledger.guard.ts                 in-memory fallback guard + setIdempotencyGuard()
│   └── __tests__/ , test-support/      unit + DB integration tests for this module
└── modules/transactions/
    ├── transaction.service.ts          runInTransaction() + isDuplicateKeyError()
    └── transaction.types.ts            TransactionStatus, TransactionWork
```

## 2. Request flow (implemented)

```
POST /api/v1/ledger/transactions
 1. requireAuth (Week 1)            -> tenantId from the verified JWT ONLY
 2. Zod validation (strict)         -> unknown fields (e.g. tenantId in body) are rejected
 3. Idempotency-Key must equal body.eventId
 4. guard.runExclusive("<tenantId>:<eventId>")   <- Person 2's Redis lock plugs in here
 5.   find existing {tenantId, eventId}
        same payload + COMPLETED  -> 200, original result (Idempotent-Replayed: true)
        different payload         -> 409 IDEMPOTENCY_KEY_REUSED
        PENDING/PROCESSING        -> 409 TRANSACTION_IN_PROGRESS (retryable)
        FAILED + same payload     -> retried under the SAME transactionId
 6.   ONE MongoDB transaction: transaction row + DEBIT entry + CREDIT entry
 7.   balance check inside the transaction (1 debit, 1 credit, both == amount)
 8. commit -> 201   |   any error -> abort, FAILED audit row, 422/500 with data.rolledBack = true
```

Protection layers (never rely on Redis alone):
1. **Redis lock** – coordination under normal operation (Person 2).
2. **MongoDB unique index** `{ tenantId, eventId }` – authoritative duplicate protection.
3. **MongoDB transaction** – all ledger writes commit or none do.

If Redis is down or a lock expires, two requests can both reach step 6. One commits;
the other hits the unique index (or a transient write conflict that Mongoose retries into
a duplicate-key error), the service re-reads the winner and answers as a replay.
This is covered by the test "REDIS DOWN: 10 concurrent requests with NO lock".

## 3. Interfaces Person 2 must satisfy

### 3.1 `ledger.model.ts` (Person 2 owns the file)
Must export `getLedgerModels(connection): { Transaction, Entry }` whose schemas match
`LedgerTransactionDoc` / `LedgerEntryDoc` in `ledger.types.ts`, with:

| Collection | Required index |
|---|---|
| `ledger_transactions` | **unique** `{ tenantId: 1, eventId: 1 }` |
| `ledger_transactions` | unique `{ tenantId: 1, transactionId: 1 }`, `{ tenantId: 1, createdAt: -1 }` |
| `ledger_entries` | `{ tenantId: 1, transactionId: 1 }` |

Money is stored as integer **minor units** (`amountMinor`). The service calls
`Model.init()` before the first write so the unique index exists.

> While Person 2's PR is not merged, use the placeholder in `PLACEHOLDERS-DO-NOT-COMMIT/`.
> **Do not commit it.** After their merge, delete your local copy and rebase.

### 3.2 `IdempotencyGuard` (Person 2 implements, Person 1 consumes)
```ts
interface IdempotencyGuard {
  runExclusive<T>(lockKey: string, work: () => Promise<T>): Promise<T>;
}
```
- Acquire with `SET key token NX PX ttl`, release with compare-and-delete on the token.
- If the lock cannot be obtained in time, `throw new LockUnavailableError()`
  (from `modules/ledger/ledger.errors.ts`) -> the API answers `409 TRANSACTION_IN_PROGRESS`.
- If Redis itself is unreachable, **choose explicitly**: either throw (fail closed, 503) or
  just run `work()` (fail open) – both are safe for money because of Mongo's unique index.

Wiring (one line, after Redis is connected, e.g. in `server.ts`):
```ts
import { setIdempotencyGuard } from './modules/ledger/ledger.guard';
setIdempotencyGuard(redisIdempotencyGuard);
```

## 4. Error codes (for Person 3's notifications)

| HTTP | `code` | Meaning | UI behaviour |
|---|---|---|---|
| 201 | – | New transaction completed | success toast |
| 200 | – | Replay of a completed transaction (`Idempotent-Replayed: true`) | info/success toast "already processed" |
| 400 | `VALIDATION_ERROR` | `errors[]` has per-field messages | inline form errors |
| 400 | `IDEMPOTENCY_KEY_MISMATCH` | header != body.eventId | developer error |
| 409 | `IDEMPOTENCY_KEY_REUSED` | same key, different payload | error toast; do NOT retry |
| 409 | `TRANSACTION_IN_PROGRESS` | being processed / lock held | retry later with the **same** key |
| 422 | `TRANSACTION_FAILED` / `LEDGER_IMBALANCE` | rolled back; `data.rolledBack = true`, `data.status = "FAILED"` | rollback state in the UI; retry allowed with the **same** key |
| 500 | `TRANSACTION_FAILED` | unexpected failure, rolled back | same as above |
| 503 | `TRANSACTIONS_UNSUPPORTED` | MongoDB is not a replica set | ops problem |

Failure bodies look like:
```json
{ "success": false, "message": "...", "code": "TRANSACTION_FAILED",
  "data": { "transactionId": "txn_...", "eventId": "evt_...", "status": "FAILED",
            "amount": 500, "currency": "INR", "failureReason": "...", "rolledBack": true } }
```

## 5. Behaviour notes (read before testing)

- **Amounts** are numbers in major units with at most 2 decimals (`1000`, `19.99`). Stored as integers (×100).
  Supported currencies: INR, USD, EUR, GBP.
- **Statuses**: only `COMPLETED` and `FAILED` are persisted. `PENDING`/`PROCESSING` exist in the type
  because the contract defines them, but the ledger write is a single atomic transaction, so no half-done row is ever visible.
- **FAILED rows** are kept for audit. Retrying the same key + same payload re-runs the write under the
  same `transactionId` (`attempts` increments). Same key + different payload is still 409.
- **Summary** `totalAmount` counts only `COMPLETED` transactions, per currency (`?currency=`, default INR).
- **List filters**: `page`, `limit` (max 100), `status`, `search` (eventId / transactionId / description, case-insensitive,
  regex-escaped), `from`, `to` (ISO timestamps; `to` is inclusive, so send end-of-day for a date filter). Newest first.
- **Account balances are not stored.** Debits/credits are an append-only entry log. (Out of Week 2 scope.)
- `GET /transactions/:id` for another tenant's id returns **404**, never 403, so existence is not revealed.

## 6. Run it

```bash
# MongoDB must be a replica set (Person 4's docker-compose.yml does this)
cd backend
cp .env.example .env            # MONGODB_MASTER_URI must contain ?replicaSet=rs0
npm run keys:generate && npm run dev

# unit tests only (DB suites are skipped without MONGO_TEST_URI)
npm run test:ledger

# full suite including real MongoDB transactions
MONGO_TEST_URI="mongodb://127.0.0.1:27017/?replicaSet=rs0" npm run test:ledger
```
