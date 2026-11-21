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
- [ ] Day 7: demo script rehearsed, evidence pack complete

## Pull requests

| Person   | Branch                      | PR  | Reviewed by | CI  | Merged |
| -------- | --------------------------- | --- | ----------- | --- | ------ |
| Person 2 | `feature/redis-locking`     |     |             |     |        |
| Person 1 | `feature/idempotent-ledger` |     |             |     |        |
| Person 3 | `feature/billing-dashboard` |     |             |     |        |
| Person 4 | `feature/week2-testing`     |     |             |     |        |

Merge order: Person 2, Person 1, Person 3, Person 4, then the team lead merges `develop` to `main`.

## Daily log

| Day | Person | Done | Next | Blockers |
| --- | ------ | ---- | ---- | -------- |
|     |        |      |      |          |
