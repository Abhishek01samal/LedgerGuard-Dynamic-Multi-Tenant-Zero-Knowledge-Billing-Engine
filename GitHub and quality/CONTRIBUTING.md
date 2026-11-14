# Contributing to LedgerGuard

## Branches

- `main` - stable, reviewed code only.
- `develop` - integration branch for the current week.
- Feature branches are created **from `develop`**:

| Developer | Branch                       |
| --------- | ---------------------------- |
| Person 1  | `feature/auth-api`           |
| Person 2  | `feature/tenant-database`    |
| Person 3  | `feature/frontend-dashboard` |
| Person 4  | `feature/testing-docs-ci`    |

Never push directly to `main` or `develop`, and never commit to someone else's branch.

## File ownership (this is what prevents merge conflicts)

| Area                                                                         | Owner    |
| ---------------------------------------------------------------------------- | -------- |
| `backend/src/app.ts`, `server.ts`, `config/`, `middleware/`, `modules/auth/` | Person 1 |
| `backend/package.json`, `backend/tsconfig*.json`                             | Person 1 |
| `backend/src/database/`, `backend/src/modules/tenants/`                      | Person 2 |
| `frontend/` (including its `package.json`)                                   | Person 3 |
| `shared/contracts/`, `backend/src/tests/`, `backend/src/modules/health/`     | Person 4 |
| `.github/`, `docs/`, root `README.md`, `CONTRIBUTING.md`, root config        | Person 4 |

Need a change in a file you do not own? Open an issue or comment on the owner's PR. Need a new
dependency? Ask the owner of that `package.json`.

## Workflow

```bash
git checkout develop && git pull origin develop
git checkout -b feature/<your-branch>

# work only inside your own folders
git add <your folders>
git commit -m "feat(auth): implement login"
git push -u origin feature/<your-branch>
```

Open a PR **into `develop`**. Keep one logical task per PR. Before pushing, pull the latest
`develop` and resolve conflicts locally.

## Commit and PR titles (Conventional Commits)

`feat(auth): ...`, `fix(database): ...`, `test: ...`, `docs: ...`, `chore(ci): ...`

## Before you open a PR

```bash
# backend
cd backend && npm run typecheck && npm run lint && npm test && npm run build
# frontend
cd frontend && npm run build
# whole repo, from the root
npx prettier --check .
```

CI runs the same checks plus a scan that fails if `.env`, `*.pem`, `node_modules` or build output
is tracked.

## Review rules

- Person 1 reviews auth/gateway changes, Person 2 database changes, Person 3 frontend changes.
- Person 4 verifies tests, CI and docs.
- The team lead approves merges into `develop`; `develop` -> `main` happens after the weekly demo.
- At least one approval and a green CI are required.

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
