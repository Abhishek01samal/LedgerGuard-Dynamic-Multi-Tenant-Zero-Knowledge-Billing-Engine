# Week 2 – Person 1 test evidence

Environment: Node 22, MongoDB 8 single-node replica set (`rs0`), Mongoose 8, TypeScript strict.
Command: `MONGO_TEST_URI="mongodb://127.0.0.1:27017/?replicaSet=rs0" npm run test:ledger`

## 1. Typecheck
`npx tsc --noEmit` -> 0 errors (strict, `noUncheckedIndexedAccess`, no `any`).

## 2. Jest (real MongoDB transactions, nothing mocked)
```
PASS src/modules/ledger/__tests__/ledger.failures.test.ts
  ledger failure handling & rollback (needs a MongoDB replica set)
    ✓ IMBALANCE: a missing credit entry is detected inside the txn and everything rolls back (121 ms)
    ✓ IMBALANCE: a wrong amount on one side is detected and rolled back (29 ms)
    ✓ DEMO ACCOUNT: writes are rolled back, a FAILED row is stored, status is 422 (21 ms)
    ✓ DEMO ACCOUNT does nothing when explicitly disabled (even if a developer set it in .env) (20 ms)
    ✓ repeating the failing request keeps failing cleanly (no duplicate rows, attempts increments) (63 ms)
    ✓ after a failure, a DIFFERENT payload on the same key is still a 409 (key is bound to its first payload) (21 ms)
    ✓ a failed event does not block other events and later counts in the summary as failed (22 ms)
    ✓ a mid-flight crash between the two entries leaves no half-written ledger (35 ms)
      ✓ returns 422 with success:false and a data block describing the rollback (62 ms)
      ✓ invalid input (zero amount) -> 400 and NOTHING is written (24 ms)
      ✓ invalid input (negative amount) -> 400 and NOTHING is written (22 ms)
      ✓ invalid input (non-numeric amount) -> 400 and NOTHING is written (21 ms)
      ✓ invalid input (3 decimal places) -> 400 and NOTHING is written (28 ms)
      ✓ invalid input (same debit and credit account) -> 400 and NOTHING is written (19 ms)
      ✓ invalid input (malformed account) -> 400 and NOTHING is written (26 ms)
      ✓ invalid input (unsupported currency) -> 400 and NOTHING is written (26 ms)
PASS src/modules/ledger/__tests__/ledger.service.create.test.ts
  LedgerService.createTransaction (needs a MongoDB replica set)
    ✓ writes the transaction plus a DEBIT and a CREDIT entry atomically (124 ms)
    ✓ same key + same payload returns the ORIGINAL result and creates nothing new (41 ms)
    ✓ same key + different payload is rejected with 409 and nothing changes (22 ms)
    ✓ rejects an Idempotency-Key that differs from eventId (12 ms)
    ✓ a different eventId is processed as a new transaction (29 ms)
    ✓ 10 concurrent identical requests with the in-memory lock create exactly one transaction (39 ms)
    ✓ REDIS DOWN: 10 concurrent requests with NO lock are still safe (unique index + txn) (157 ms)
    ✓ maps lock contention to a retryable 409 (28 ms)
    ✓ ROLLBACK: a failure after both entries are written leaves NO ledger entries and a FAILED audit row (29 ms)
    ✓ retrying a FAILED event with the SAME key succeeds and completes the same transaction (40 ms)
    ✓ TENANT ISOLATION: the same eventId in two tenants never collides or leaks (58 ms)
PASS src/modules/ledger/__tests__/ledger.routes.http.test.ts
  ledger HTTP API (needs a MongoDB replica set)
    ✓ POST creates (201) with exactly the frozen contract shape (116 ms)
    ✓ POST replay returns 200 with the same transaction (24 ms)
    ✓ POST same key + different payload -> 409 (22 ms)
    ✓ POST validation: missing key header, bad body, mismatch (17 ms)
    ✓ GET list paginates, filters and sorts newest first (102 ms)
    ✓ GET one returns details with both ledger entries; unknown id -> 404 (28 ms)
    ✓ GET summary counts only completed money (52 ms)
    ✓ TENANT ISOLATION over HTTP: B cannot list, read or summarise A (52 ms)
    ✓ ignores a tenantId smuggled in headers/query/body (24 ms)
    ✓ requireAuth is still the gate in app.ts (no token -> 401) (8 ms)
PASS src/modules/transactions/__tests__/transaction.service.test.ts
  runInTransaction (needs a MongoDB replica set)
    ✓ commits all writes when work succeeds (10 ms)
    ✓ rolls back ALL writes when work throws midway (50 ms)
    ✓ writes are invisible outside the transaction until commit (8 ms)
    ✓ surfaces duplicate-key errors in a way isDuplicateKeyError recognises, and rolls back (10 ms)
  isDuplicateKeyError
    ✓ only matches code 11000 (1 ms)
PASS src/modules/ledger/__tests__/ledger.guard.test.ts
  InMemoryIdempotencyGuard
    ✓ runs same-key work one at a time, in order (37 ms)
    ✓ does not block different keys (20 ms)
    ✓ releases the lock when work throws (6 ms)
PASS src/modules/ledger/__tests__/ledger.validation.test.ts
  createTransactionSchema
    ✓ accepts the frozen contract example
    ✓ rejects zero amount
    ✓ rejects negative amount (5 ms)
    ✓ rejects 3 decimals
    ✓ rejects string amount
    ✓ rejects NaN amount
    ✓ rejects huge amount (1 ms)
    ✓ rejects unknown currency
    ✓ rejects same accounts
    ✓ rejects bad account chars
    ✓ rejects injection-like account (1 ms)
    ✓ rejects empty description
    ✓ rejects short eventId
    ✓ rejects unknown field
    ✓ allows 2-decimal amounts despite float noise (13 ms)
  other schemas
    ✓ idempotency key
    ✓ list query defaults and empty strings (1 ms)
    ✓ list query bounds and bad values (1 ms)
    ✓ summary currency defaults to INR
    ✓ transaction id param (1 ms)
PASS src/modules/ledger/__tests__/ledger.mapper.test.ts
  money conversion
    ✓ 1000 -> 100000 minor units (no float drift) (1 ms)
    ✓ 10.1 -> 1010 minor units (no float drift)
    ✓ 0.07 -> 7 minor units (no float drift)
    ✓ 19.99 -> 1999 minor units (no float drift)
    ✓ 1.15 -> 115 minor units (no float drift)
  payload hashing
    ✓ is stable for equal requests, including float-equivalent amounts
    ✓ changes when amount changes
    ✓ changes when currency changes (1 ms)
    ✓ changes when debit changes
    ✓ changes when credit changes
    ✓ changes when description changes
  helpers
    ✓ generates unique txn ids matching the route param pattern
    ✓ escapes regex metacharacters (1 ms)
    ✓ maps a document to the API view
Test Suites: 7 passed, 7 total
Tests:       79 passed, 79 total
```
Without `MONGO_TEST_URI` the DB suites are skipped (not failed): 38 passed, 41 skipped.

## 3. Live demo run (`backend/scripts/demo-ledger.sh`, real server, real JWT cookies)
```

== 0. Login Company A and Company B ==
   HTTP 200 | replayed=-
   {"success":true,"message":"Login successful","data":{"user":{"id":"user_001","email":"admin@companya.com","tenantId":"company_A","role":"admin"}}}
   HTTP 200 | replayed=-
   {"success":true,"message":"Login successful","data":{"user":{"id":"user_002","email":"admin@companyb.com","tenantId":"company_B","role":"admin"}}}

== 1. Company A creates a transaction  (expect 201 COMPLETED) ==
   HTTP 201 | replayed=false
   {"success":true,"message":"Transaction completed","data":{"transactionId":"txn_d1a306fa-770f-4e98-84ec-baa84fbbca7c","eventId":"evt_demo_1794763641_001","status":"COMPLETED","amount":1000,"currency":"INR"}}

== 2. Same event submitted again  (expect 200, replayed=true, SAME transactionId, no duplicate) ==
   HTTP 200 | replayed=true
   {"success":true,"message":"Transaction already completed","data":{"transactionId":"txn_d1a306fa-770f-4e98-84ec-baa84fbbca7c","eventId":"evt_demo_1794763641_001","status":"COMPLETED","amount":1000,"currency":"INR"}}

== 3. Same key, DIFFERENT payload  (expect 409 IDEMPOTENCY_KEY_REUSED) ==
   HTTP 409 | replayed=-
   {"success":false,"message":"This idempotency key was already used with a different request payload","code":"IDEMPOTENCY_KEY_REUSED"}

== 4. 10 concurrent duplicate requests  (expect exactly one 201, the rest 200) ==
         9 200
         1 201
   ledger rows for evt_demo_1794763641_race:
   total = 1

== 5. Company B uses the SAME eventId  (expect 201: tenants are isolated) ==
   HTTP 201 | replayed=false
   {"success":true,"message":"Transaction completed","data":{"transactionId":"txn_0c3f09da-d9fa-4384-a335-1d32243a29b6","eventId":"evt_demo_1794763641_001","status":"COMPLETED","amount":77,"currency":"INR"}}

== 6. Isolation: B cannot read A's transaction  (expect 404)  and lists only its own ==
   HTTP 404 | replayed=-
   {"success":false,"message":"Transaction not found","code":"TRANSACTION_NOT_FOUND"}
   B total: 2
   A total: 5

== 7. Simulated MongoDB failure  (expect 422, rolledBack=true, FAILED row, ZERO ledger entries) ==
   HTTP 422 | replayed=-
   {"success":false,"message":"Simulated failure: the ledger write was rolled back","code":"TRANSACTION_FAILED","data":{"transactionId":"txn_75a18d02-b5f5-4293-a491-9f90ef62a169","eventId":"evt_demo_1794763641_fail","status":"FAIL
   detail (entries must be empty): {"success":true,"data":{"transactionId":"txn_75a18d02-b5f5-4293-a491-9f90ef62a169","eventId":"evt_demo_1794763641_fail","status":"FAILED","amount":500,"currency":"INR","description":"Monthly subs
   (If you see 201 instead of 422, set LEDGER_DEMO_FAIL_ACCOUNT=fail_account in .env and restart.)

== 8. Summary for A and B ==
   A: {"success":true,"data":{"totalTransactions":6,"successfulTransactions":4,"failedTransactions":2,"totalAmount":2600,"currency":"INR"}}
   B: {"success":true,"data":{"totalTransactions":2,"successfulTransactions":2,"failedTransactions":0,"totalAmount":154,"currency":"INR"}}

== 9. Validation + auth guards ==
   HTTP 400 | replayed=-
   {"success":false,"message":"Validation failed","code":"VALIDATION_ERROR","errors":[{"path":"amount","message":"Amount must be greater than zero"}]}
   HTTP 401 | replayed=-
   no cookie -> {"success":false,"message":"Authentication required","code":"UNAUTHENTICATED"}

Done. Cross-check in mongosh: db.ledger_transactions.countDocuments({eventId:"evt_demo_1794763641_001"})
```

## 4. Database proof (mongosh/driver, after the demo)
```
company_A transactions= 6 entries= 8
 indexes: [{"tenantId":1,"eventId":1},{"tenantId":1,"transactionId":1}]
 duplicate (tenant,eventId) groups: 0
company_B transactions= 2 entries= 4
 indexes: [{"tenantId":1,"eventId":1},{"tenantId":1,"transactionId":1}]
 duplicate (tenant,eventId) groups: 0
```
No `(tenantId, eventId)` group has more than one row; each tenant lives in its own database
(`tenant_company_A`, `tenant_company_B`); unique indexes `{tenantId, eventId}` and
`{tenantId, transactionId}` are present.

## 5. Also verified
- Standalone (non-replica-set) MongoDB returns `503 TRANSACTIONS_UNSUPPORTED` with a clear message.
- A request that tries to smuggle `tenantId` in the body is rejected (400); `X-Tenant-Id` / `?tenantId=` are ignored.
- With **no lock at all** (simulated Redis outage), 10 concurrent identical requests still produce exactly one transaction and two entries.
