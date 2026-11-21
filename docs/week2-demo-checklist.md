# Week 2 – Person 1 demo checklist (mid-project review)

Run `bash backend/scripts/demo-ledger.sh` and narrate each step.

| # | Review demonstration | Script step | Expected |
|---|---|---|---|
| 1 | Company A creates transaction | 1 | `201`, status `COMPLETED`; only A's DB changes |
| 2 | Duplicate event submitted | 2 | `200`, `Idempotent-Replayed: true`, same `transactionId` |
| 3 | Same key, different payload | 3 | `409 IDEMPOTENCY_KEY_REUSED` |
| 4 | Concurrent duplicate requests | 4 | exactly one `201`, nine `200`, total = 1 |
| 5 | Company B creates transaction | 5 | `201`; A's ledger unchanged |
| 6 | Database isolation | 6 | B gets `404` for A's id; totals differ per tenant |
| 7 | MongoDB transaction fails | 7 | `422`, `rolledBack: true`, zero entries |

## Evidence to capture
- Terminal output of the script (screenshot / `script` recording).
- `MONGO_TEST_URI=... npm run test:ledger` output (see `docs/week2-person1-test-evidence.md`).
- mongosh proof of no duplicates and no half-written ledger:
  ```js
  use tenant_company_A
  db.ledger_transactions.countDocuments({ eventId: "<event id from step 1>" })   // 1
  db.ledger_entries.find({ transactionId: "<failed txn id>" }).count()           // 0
  db.ledger_transactions.getIndexes()                                           // unique {tenantId, eventId}
  ```

## Talking points for the "Isolation Audit"
1. `tenantId` is read only from the verified RS256 token (`getTenantContext`), never from body, query or headers.
2. Each tenant has its own database via `getTenantConnection`; every ledger query is **also** filtered by `tenantId`.
3. Another tenant's transaction id returns 404, not 403.
4. Unique index `{tenantId, eventId}`: the same eventId can exist in two tenants without collision.
