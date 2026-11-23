# Week 2 progress

Idempotent ledger and transaction management. Update daily. Tick a box only when there is
evidence (PR link, test output or screenshot) and write the evidence next to it.

## Local setup (every developer)

```bash
docker compose up -d --wait      # MongoDB replica set rs0 + Redis, from the repo root
cd backend
cp .env.example .env             # add MONGODB_MASTER_URI and REDIS_URL (see docker-compose.yml)
npm run test:unit                # no Docker needed
npm run test:integration         # needs the two containers
```

Backend scripts Person 1 adds to `backend/package.json` (Person 4 does not edit that file):

```json
"test:unit": "jest --selectProjects unit",
"test:integration": "jest --selectProjects integration --runInBand --forceExit",
"test": "jest --runInBand --forceExit",
"test:ci": "jest --runInBand --forceExit --coverage"
```

## Redis and locking

- [ ] Redis connection successful
- [ ] Lock acquisition successful
- [ ] Duplicate lock acquisition rejected
- [ ] Lock ownership checked on release
- [ ] Expired lock handled correctly
- [ ] Redis outage handled safely

## Idempotent ledger

- [ ] Unique event ID enforced
- [ ] Same event does not create duplicate entries
- [ ] Same key with different payload returns 409
- [ ] Concurrent duplicate requests handled
- [ ] Existing completed result returned on retry

## MongoDB transactions

- [ ] MongoDB replica set configured
- [ ] Debit and credit written atomically
- [ ] Successful transaction commits
- [ ] Simulated failure rolls back
- [ ] Duplicate-key race handled
- [ ] Tenant database isolation verified

## Frontend

- [ ] Ledger page displays transactions
- [ ] Transaction details view works
- [ ] Success notification works
- [ ] Failure notification works
- [ ] Loading and empty states work
- [ ] Filters and pagination work

## GitHub and integration

- [ ] All four PRs reviewed
- [ ] No merge conflicts
- [ ] No `.env` or private keys committed
- [ ] TypeScript checks pass
- [ ] Backend tests pass
- [ ] Frontend build passes
- [ ] CI pipeline passes
- [ ] Week 2 documentation updated

## Person 4 deliverables by day

- [ ] Day 1: Docker Compose (MongoDB rs0 + Redis), Jest structure, Week 2 contracts frozen
- [ ] Day 2: Redis and replica-set smoke tests, duplicate-event cases prepared
- [ ] Day 3: duplicate, concurrent and failure tests running against the services
- [ ] Day 4: end-to-end ledger API tests, response contracts validated, PRs reviewed
- [ ] Day 5: concurrency suite, tenant isolation, error handling, test evidence
- [ ] Day 6: CI with Redis and MongoDB, documentation, final review
- [ ] Day 7: demo script rehearsed, evidence pack complete (see Mid-project review)

## Pull requests

| Person   | Branch                      | PR  | Reviewed by | CI  | Merged |
| -------- | --------------------------- | --- | ----------- | --- | ------ |
| Person 2 | `feature/redis-locking`     |     |             |     |        |
| Person 1 | `feature/idempotent-ledger` |     |             |     |        |
| Person 3 | `feature/billing-dashboard` |     |             |     |        |
| Person 4 | `feature/week2-testing`     |     |             |     |        |

Merge order: Person 2, Person 1, Person 3, Person 4, then the team lead merges `develop` to `main`.

## Mid-project review (end of Week 2)

### Backend: isolation audit

- [ ] Code review notes showing database isolation between tenants (PR comments linked)
- [ ] Mock trace tests: fast database switching under load (`[isolation-trace]` lines from
      `concurrency.test.ts`, screenshot attached)
- [ ] Company A writes change only Company A (`ledger.test.ts`)
- [ ] Company B writes change only Company B (`ledger.test.ts`)

### Frontend: state resiliency

- [ ] UI shows the rolled-back / failed transaction state (failure toast + `FAILED` badge)
- [ ] UI shows success state after a completed transaction
- [ ] Retrying a failed request reuses the same idempotency key (no new key)

### Demo script (7 steps, about 8 minutes)

| Step | Action                                                       | Expected result                                 |
| ---- | ------------------------------------------------------------ | ----------------------------------------------- |
| 1    | Company A creates a transaction                              | 201, appears in A's ledger only                 |
| 2    | Company B creates a transaction                              | 201, appears in B's ledger only                 |
| 3    | Re-send the same event (same key, same body)                 | 200 + `Idempotent-Replayed: true`, no new entry |
| 4    | Re-send the same key with a different amount                 | 409 `IDEMPOTENCY_CONFLICT`                      |
| 5    | Fire 10 identical requests at once                           | One 201, others replay or 409, one entry        |
| 6    | Force a commit failure (`transaction.test.ts`)               | 500, nothing committed, failure toast in the UI |
| 7    | Show the React ledger: list, details, filters, notifications | Matches the backend records                     |

### Evidence pack

- [ ] GitHub repository link
- [ ] Architecture diagram (`docs/architecture.md`)
- [ ] Screenshot: `docker ps` with MongoDB and Redis running
- [ ] Postman requests and responses for the four ledger endpoints plus a duplicate and a 409
- [ ] Jest integration results (CI artifact `backend-test-evidence` or `docs/evidence-jest.txt`)
- [ ] Database records showing duplicate prevention (one document for the replayed `eventId`)
- [ ] Frontend ledger screenshots (table, details, success and failure notifications)
- [ ] Short demonstration video

Do not start Week 3 work before the review. The ledger already stores `createdAt`, `amount`,
`currency` and `status`, which the Week 3 aggregations will read.

## Daily log

| Day | Person | Done | Next | Blockers |
| --- | ------ | ---- | ---- | -------- |
|     |        |      |      |          |
