# Testing report

| Suite | What it proves |
|---|---|
| ledger unit/HTTP | Idempotency, validation, tenant-scoped reads |
| aggregation.test | Pipeline tenant/currency/date rules |
| usage.test | Remaining limit and UTC month math |
| signature.test | RSA sign/verify, expiry, nonce replay |
| security.test | Unauthenticated APIs, login cookie, query tenantId ignored |
| logging.test | Secret redaction |
| analytics-isolation.test | Company A spend is not Company B (needs replica set) |

Run `cd backend && npm test`.
