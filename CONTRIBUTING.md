# Contributing to LedgerGuard

Welcome to LedgerGuard! Please follow these guidelines to keep the codebase clean, consistent, and secure.

## Branching Strategy

- `main` - Stable, production-ready code.
- Feature branches:
  - `abhishek` (Person 1): Backend auth, server foundation, API gateway.
  - `vinay` (Person 2): Multi-tenant database connections, tenant isolation.
  - `shraddha` (Person 3): Frontend Vite React application, dashboard, UI components.
  - `sdilleswari` (Person 4): Shared contracts, testing, CI/CD, documentation, quality assurance.

## Local Development Setup

1. **Root (Formatting & Hygiene):**
   ```bash
   npm install
   npm run format:check
   ```

2. **Backend:**
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run keys:generate
   npm run dev
   ```

3. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Commit & PR Rules

- Do **not** commit `.env` files or private keys (`*.pem`).
- Ensure all tests pass before opening a PR: `npm test`.
- Run typechecking: `npm run typecheck`.
- Format code with Prettier before committing: `npm run format`.

