# System architecture

```
Browser (React)
  JWT cookie / Bearer
API gateway (Express)
  Helmet, CORS, rate limit, request id
  Auth middleware -> tenantId from token
  Tenant connection manager -> tenant_<id>
  Redis lock -> ledger service -> Mongo transaction
  Analytics aggregations on ledger_transactions
  Audit events in tenant DB
```

Private keys stay on the API host. The frontend only stores the session cookie the browser already keeps as httpOnly.
