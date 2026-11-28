# Analytics architecture

Week 2 `ledger_transactions` is the only source of truth. Analytics does not duplicate the collection.

```
ledger write (COMPLETED/FAILED)
        -> MongoDB aggregation (tenant connection)
        -> analytics + usage services
        -> React dashboard (Chart.js)
```

Rules:

- Count ledger transactions, not debit and credit entries.
- Never add INR and USD together.
- Use integer `amountMinor`.
- Historical queries always include `tenantId` even though each tenant has its own database.
