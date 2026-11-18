# Contributing to LedgerGuard

## Branches

- `main` - stable, reviewed code only.
- `develop` - integration branch for the current week.
- Feature branches are created **from `develop`**:

| Developer | Week 1 branch                | Week 2 branch               |
| --------- | ---------------------------- | --------------------------- |
| Person 1  | `feature/auth-api`           | `feature/idempotent-ledger` |
| Person 2  | `feature/tenant-database`    | `feature/redis-locking`     |
| Person 3  | `feature/frontend-dashboard` | `feature/billing-dashboard` |
| Person 4  | `feature/testing-docs-ci`    | `feature/week2-testing`     |

Never push directly to `main` or `develop`, and never commit to someone else's branch.

## File ownership (this is what prevents merge conflicts)

| Area                                                                                                    | Week 1 owner | Week 2 owner |
| ------------------------------------------------------------------------------------------------------- | ------------ | ------------ |
| `backend/src/app.ts`, `server.ts`, `config/env.ts`, `middleware/` (except idempotency), `modules/auth/` | Person 1     | Person 1     |
| `backend/src/modules/ledger/` (controller, service, routes, validation, types)                          | -            | Person 1     |
| `backend/src/modules/transactions/`                                                                     | -            | Person 1     |
| `backend/package.json`, `backend/tsconfig*.json`                                                        | Person 1     | Person 1     |
| `backend/src/database/`, `backend/src/modules/tenants/`                                                 | Person 2     | Person 2     |
| `backend/src/config/redis.ts`, `services/` (redis, lock, idempotency)                                   | -            | Person 2     |
| `modules/ledger/ledger.model.ts`, `middleware/idempotency.middleware.ts`                                | -            | Person 2     |
| `frontend/` (including its `package.json`)                                                              | Person 3     | Person 3     |
| `shared/contracts/`, `backend/src/tests/`, `backend/src/modules/health/`                                | Person 4     | Person 4     |
| `.github/`, `docs/`, `docker-compose.yml`, root `README.md`, `CONTRIBUTING.md`, root config             | Person 4     | Person 4     |

Need a change in a file you do not own? Open an issue or comment on the owner's PR. Need a new
dependency? Ask the owner of that `package.json` (Person 1 for the backend, Person 3 for the
frontend) so two people never edit it at once.

`ledger.model.ts` belongs to Person 2 because it carries the unique idempotency index. Person 1
consumes it through the agreed interface and never edits it.

## Workflow

```bash
git checkout develop && git pull origin develop
git checkout -b feature/<your-branch>

# work only inside your own folders
git add <your folders>
git commit -m "feat(ledger): implement atomic transaction processing"
git push -u origin feature/<your-branch>
```

Open a PR **into `develop`**. Keep one logical task per PR. Before pushing, pull the latest
`develop` and resolve conflicts locally.

If you need another person's unfinished module, agree on the interface first and use a temporary
mock. Do not import from an unfinished feature branch.

## Week 2 merge order

1. Person 2 - Redis, locks, idempotency, ledger schema
2. Person 1 - ledger transaction engine (needs Person 2's interfaces)
3. Person 3 - billing dashboard
4. Person 4 - tests, docs, CI, then the full integrated suite
5. Team lead - verify `develop`, merge the release into `main` after approval

## Commit and PR titles (Conventional Commits)

`feat(ledger): ...`, `feat(redis): ...`, `fix(database): ...`, `test: ...`, `docs: ...`,
`chore(ci): ...`

## Before you open a PR

```bash
# infrastructure for integration tests (repo root)
docker compose up -d --wait

# backend
cd backend && npm run typecheck && npm run lint && npm test && npm run build
# frontend
cd frontend && npm run build
# whole repo, from the root
npx prettier --check .
```

`npm run test:unit` needs no Docker. `npm run test:integration` needs MongoDB (replica set) and
Redis from `docker-compose.yml`.

CI runs the same checks plus a scan that fails if `.env`, `*.pem`, `node_modules` or build output
is tracked.

## Review rules

- Person 1 reviews ledger/auth/gateway changes, Person 2 Redis and database changes, Person 3
  frontend changes.
- Person 4 verifies tests, CI and docs, and runs the integrated suite.
- The team lead approves merges into `develop`; `develop` -> `main` happens after the weekly demo.
- At least one approval and a green CI are required.

## Money and financial-safety rules

- Amounts are integers in minor units (or Decimal128). Never floating point.
- Redis is coordination only. The MongoDB unique index and transaction are authoritative.
- Release a lock only if the stored token matches the owner.
- Retry with the **same** idempotency key. Never generate a new key to "retry".
- Never log secrets, tokens or full request bodies.

## Code standards

- Strict TypeScript. **No `any`, no `@ts-ignore`, no disabled strict flags.** ESLint enforces it.
- Prettier formatting (`.prettierrc` at the root).
- API shapes follow `shared/contracts/`. If a contract must change, Person 4 updates it first and
  tags everyone.
- The tenant comes only from the verified JWT. Never trust a tenant sent by the client.
- Never commit secrets. Use `.env` locally and update `.env.example` when you add a variable.

## Communication

Post a short daily update: what you finished, what is next, and any blockers. Ask for help early,
resolve disagreements by discussion, and escalate to the mentor if the team cannot agree. Be
respectful and professional at all times.
