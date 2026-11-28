# API contracts

See `shared/contracts/` and `docs/analytics-api.md`.

Ledger create:

```json
{
  "eventId": "evt_companyA_001",
  "description": "Monthly subscription",
  "amount": 1000,
  "currency": "INR",
  "debitAccount": "customer_001",
  "creditAccount": "merchant_001"
}
```

Header: `Idempotency-Key: evt_companyA_001`.
