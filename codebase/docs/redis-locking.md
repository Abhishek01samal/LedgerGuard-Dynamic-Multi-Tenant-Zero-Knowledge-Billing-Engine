# Redis locking and idempotency

Owner of the code: Person 2. Owner of this document and the tests: Person 4.

## Three separate protections

| Layer                | Job                                                             | Authoritative? |
| -------------------- | --------------------------------------------------------------- | -------------- |
| Redis lock           | Stops two requests processing the same event at the same moment | No             |
| MongoDB unique index | Durable duplicate guard: unique per tenant + event id           | **Yes**        |
| MongoDB transaction  | Debit and credit commit together or not at all                  | **Yes**        |

Redis can lose a lock (expiry, restart, network). Financial correctness must never depend on it
alone. If every lock were removed, the unique index would still prevent a duplicate entry.

## Key naming

| Purpose                          | Key                                | Notes                                  |
| -------------------------------- | ---------------------------------- | -------------------------------------- |
| Processing lock                  | `lock:ledger:{tenantId}:{eventId}` | `SET key token NX PX ttl`              |
| Idempotency fast path (optional) | `idem:ledger:{tenantId}:{eventId}` | A hint only. Never proof of completion |

The tenant id is always part of the key, so Company A and Company B can reuse an `eventId`
without contending for the same lock. `acquireLock` uses the key exactly as given (no hidden
prefix), which is what the tests rely on.

## Lock interface (frozen Day 1)

```ts
export interface Lock {
  key: string;
  token: string; // unique per acquisition (UUID or 16+ random bytes)
}
export function acquireLock(key: string, ttlMs: number): Promise<Lock | null>;
export function releaseLock(lock: Lock): Promise<boolean>;
```

- `acquireLock` returns `null` when somebody else holds the lock. It never waits forever.
- `releaseLock` returns `true` only when the stored token still matched and the key was deleted.

### Safe release (compare-and-delete)

A plain `DEL` can delete a lock that now belongs to somebody else (the original one expired).
Release must check the token and delete in one atomic step:

```lua
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end
```

## Request lifecycle

1. `requireAuth` verifies the JWT and resolves the tenant.
2. Idempotency middleware checks the header, then `acquireLock(lock:ledger:{tenant}:{eventId}, ttl)`.
3. Lock not acquired: look up the durable record. Completed -> replay it (200). Still processing
   -> `409 REQUEST_IN_PROGRESS` with `Retry-After`.
4. Lock acquired: look up the durable record again (another request may have finished meanwhile),
   then run the MongoDB transaction.
5. Store the final result durably, then `releaseLock` in a `finally` block.

## Failure behaviour

| Failure                                | Expected behaviour                                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Lock expires while the work still runs | The unique index rejects the second writer; no duplicate entry                                                                |
| Process crashes holding a lock         | The TTL frees it; a retry with the same key then proceeds                                                                     |
| Client disconnects after the DB commit | Retry with the same key returns the stored result, not a second payment                                                       |
| Duplicate-key error from MongoDB       | Treated as "already processed": return the existing record, not a 500                                                         |
| Redis unavailable                      | Fail closed (`503 SERVICE_UNAVAILABLE`) or continue with the unique index only. Never report success without a durable record |
| Same key, different payload            | `409 IDEMPOTENCY_CONFLICT`                                                                                                    |

TTL guidance: longer than the slowest normal transaction (start with 10 s). Do not "extend until
it works": a long TTL only delays recovery after a crash.

## Test matrix

| Checklist item                             | Test file             | Added on    |
| ------------------------------------------ | --------------------- | ----------- |
| Redis connection successful                | `idempotency.test.ts` | Day 2       |
| Lock acquisition successful                | `idempotency.test.ts` | Day 2       |
| Duplicate lock acquisition rejected        | `idempotency.test.ts` | Day 2       |
| Lock ownership checked on release          | `idempotency.test.ts` | Day 2       |
| Expired lock handled correctly             | `idempotency.test.ts` | Day 2       |
| Redis outage handled safely                | `concurrency.test.ts` | Day 5       |
| Same key twice returns the original result | `idempotency.test.ts` | Day 3       |
| Concurrent duplicate requests handled      | `concurrency.test.ts` | Day 3 and 5 |

## Running the tests

```bash
docker compose up -d --wait
cd backend
npm run test:integration -- idempotency
```

Tests use Redis database 15 and flush it before and after the run. They refuse to run against
database 0.

## Redis outage policy (decision for Person 2, tested by Person 4)

Two behaviours are safe. The test accepts either, and fails on anything else:

1. **Fail closed.** Respond `503 SERVICE_UNAVAILABLE`. No lock, no write. The client retries later
   with the same key.
2. **Degrade to the database.** Skip the lock and rely on the unique index and the transaction.
   Correct, but more contention (some requests end in duplicate-key handling).

Never acceptable: reporting success without a durable record, or processing twice.

After the outage, a retry with the same key must leave exactly one payment in the ledger.

## Lock expiry during work

If the lock disappears while a request is still running, a second request can start. The unique
index on `(tenantId, eventId)` makes the late writer fail with a duplicate-key error. That error
must be handled as "already processed" (return the stored record), not as a 500. Covered by
`concurrency.test.ts` ("lock expiry while work is still running").

## Evidence for the mid-project review

```bash
docker compose up -d --wait
cd backend
npm run test:integration -- --verbose 2>&1 | tee ../docs/evidence-jest.txt   # screenshot or attach
docker ps                                                                    # Redis + MongoDB up
docker exec ledgerguard-redis redis-cli -n 15 keys 'lock:*'                  # locks while a test runs
```

Do not commit `docs/evidence-jest.txt`; attach it to the PR.
