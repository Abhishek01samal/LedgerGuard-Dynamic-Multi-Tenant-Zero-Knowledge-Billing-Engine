# Ledger flow

How one billing event travels through LedgerGuard, and which test proves each step.

## Example

Company A charges a customer INR 1,000. Two ledger entries are written:

| Account      | Entry type | Amount |
| ------------ | ---------- | ------ |
| customer_001 | DEBIT      | 1000   |
| merchant_001 | CREDIT     | 1000   |

Both commit together or neither exists.

## Request flow

```
1. React (Person 3)            POST /api/v1/ledger/transactions
                               Authorization + Idempotency-Key: <eventId>
2. API gateway (Week 1)        requireAuth -> tenantId from the verified JWT
3. Idempotency middleware      header present? equals body eventId? (Person 2)
4. Redis lock                  SET lock:ledger:{tenant}:{eventId} token NX PX ttl
5. Durable lookup              existing record for (tenant, eventId)?
                               - same payload, COMPLETED -> replay original (200)
                               - different payload       -> 409 IDEMPOTENCY_CONFLICT
                               - lock busy, no record    -> 409 REQUEST_IN_PROGRESS
6. MongoDB transaction         debit + credit + transaction record (Person 1)
                               unique index (tenant, eventId) is the final guard
7. Commit or abort             commit -> COMPLETED, abort -> nothing is written
8. Release lock                compare-and-delete with the ownership token
9. React notification          201 / 200 -> success toast, 4xx / 5xx -> failure toast
```

Steps 4 and 6 are independent protections. Remove Redis and step 6 still prevents duplicates.

## Transaction status

```
PENDING -> PROCESSING -> COMPLETED
                      -> FAILED
```

`FAILED` means the ledger write rolled back. A `FAILED` transaction never has ledger entries.
`totalAmount` in the summary counts only `COMPLETED` transactions.

## Decision table

| Same key seen before? | Payload   | Original state | Answer                             |
| --------------------- | --------- | -------------- | ---------------------------------- |
| No                    | -         | -              | 201, new transaction               |
| Yes                   | Identical | COMPLETED      | 200 + `Idempotent-Replayed: true`  |
| Yes                   | Different | any            | 409 `IDEMPOTENCY_CONFLICT`         |
| Yes                   | Identical | PROCESSING     | 409 `REQUEST_IN_PROGRESS`          |
| No (other tenant)     | -         | -              | 201, tenants never share event ids |

## Failure scenarios

| What goes wrong                        | Result                                                  | Test                                    |
| -------------------------------------- | ------------------------------------------------------- | --------------------------------------- |
| Second write fails inside the DB txn   | First write rolled back                                 | `transaction.test.ts` (infrastructure)  |
| Commit throws                          | 500 `TRANSACTION_FAILED`, no money moved, retry is safe | `transaction.test.ts` (ledger rollback) |
| Invalid amount, currency or accounts   | 400, nothing written                                    | `transaction.test.ts` (invalid input)   |
| Response lost, client retries          | Original result returned, one entry                     | `idempotency.test.ts`                   |
| 10 identical requests at once          | One 201, the rest replay or retryable 409, one entry    | `concurrency.test.ts`                   |
| Worker crashed holding the lock        | 409 until the TTL expires, then the retry succeeds      | `idempotency.test.ts`                   |
| Redis hint says "completed", no DB row | Answer is backed by a real record, never by the hint    | `idempotency.test.ts`                   |

## Money

Amounts are positive integers (minor units), never floating point. Open decision for the Day 1
sync: whether `1000` means INR 1,000.00 or INR 10.00. Pick one, document it here, and use it in
the API, the stored model and the UI formatting.

## Multi-tenancy

Each tenant has its own database, chosen from the verified JWT. The unique index is
`(tenantId, eventId)` in the tenant database, so Company A and Company B can both use
`evt_001`, and neither can read the other's transactions (an id from another tenant answers 404).
