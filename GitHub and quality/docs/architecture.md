# Architecture (Week 1)

```
React client (Person 3)
   |  HttpOnly cookie (RS256 JWT)
   v
Express API gateway (Person 1)
   |-- helmet, CORS, JSON parser, cookie parser
   |-- requireAuth: verify signature, expiry, issuer, claim shape
   |        -> req.auth = { sub, email, tenantId, role }
   v
getTenantContext(req) -> { tenantId, userId }
   v
Tenant connection manager (Person 2)
   |-- trusted tenant registry (never a URI from the token)
   |-- cached, reusable connection per tenant
   v
company_A database      company_B database
```

## Request flow

1. `POST /api/v1/auth/login` verifies credentials (bcrypt) and signs an RS256 JWT containing
   `sub`, `email`, `tenantId`, `role`.
2. The token is set as an HttpOnly cookie; the body contains only the user object.
3. Protected routes pass through `requireAuth`, which accepts only RS256, checks issuer and expiry,
   and validates the claims with Zod.
4. Tenant-scoped code calls `getTenantContext(req)` and then `getTenantConnection(tenantId)`.
5. The connection manager resolves `tenantId` in the registry and returns the isolated connection.

## Isolation guarantees

- The tenant is derived from a verified signature, so a client cannot choose another tenant.
- `X-Tenant-Id`, query and body values are ignored (covered by `tenant.test.ts`).
- Tampering with a token payload invalidates the signature (401).
- Unknown tenants are rejected by the registry (Person 2 test, pending).

## Error format

```json
{ "success": false, "message": "Invalid token", "code": "INVALID_TOKEN" }
```

Validation errors add `errors: [{ path, message }]`.
