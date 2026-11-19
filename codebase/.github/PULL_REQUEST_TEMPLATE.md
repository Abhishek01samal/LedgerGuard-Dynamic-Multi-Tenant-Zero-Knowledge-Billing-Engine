## Description

<!-- What does this PR implement and why? -->

## Developer

- [ ] Person 1 (Ledger API / transaction engine)
- [ ] Person 2 (Redis locks / idempotency / ledger schema)
- [ ] Person 3 (Billing dashboard)
- [ ] Person 4 (Integration / QA / docs)

## Changes made

-
-

## Files changed

<!-- Only files you own. If you touched someone else's file, say why and tag the owner. -->

-

## Testing

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test:unit` passes (no Docker needed)
- [ ] `npm run test:integration` passes with `docker compose up -d --wait` (backend PRs)
- [ ] App builds (frontend PRs)
- [ ] `npx prettier --check .` passes from the repo root
- [ ] No `.env`, `*.pem`, `node_modules` or build output committed

## Integration

- [ ] Follows the shared contracts in `shared/contracts/` (including `ledger.contract.ts`)
- [ ] No unrelated files modified
- [ ] No breaking changes (or they are listed above and the owners are tagged)
- [ ] Tenant identity is taken from the verified JWT only (backend PRs)

## Financial safety (backend PRs touching the ledger)

- [ ] Money is an integer (or Decimal128), never a float
- [ ] The MongoDB unique index, not Redis, is the final duplicate guard
- [ ] Debit and credit are written inside one MongoDB transaction
- [ ] Locks use an ownership token and are released with compare-and-delete
- [ ] A retry uses the same idempotency key; a replay never reprocesses the payment
- [ ] Redis or network failure cannot produce a duplicate or half-written entry
- [ ] No secrets, tokens or full request bodies are logged

## Screenshots (frontend PRs)

<!-- Ledger table, details, success/failure notifications, loading and empty states -->

## Reviewer checklist

- [ ] Owner of the touched area approved
- [ ] CI is green
