# Week 4 progress

- JWT already RS256; issuer and audience now enforced
- RSA-SHA256 receipt signatures (`GET /api/v1/security/receipt/:id`)
- Optional request-body signatures when `REQUIRE_REQUEST_SIGNATURE=true`
- Request IDs, Winston JSON logs, tenant audit collection
- Helmet, CORS allowlist, rate limits
- Redis lock wired at startup when `REDIS_URL` is set
- Dockerfiles, compose, GitHub Actions CI/deploy workflows
- Frontend billing workflow with idempotent retry of the same eventId
