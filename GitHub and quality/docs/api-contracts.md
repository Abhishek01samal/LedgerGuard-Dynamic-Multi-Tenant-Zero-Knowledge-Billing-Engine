# API contracts (Week 1)

Proposed team contracts, not Infotact specifications. Source of truth in code:
`shared/contracts/`. Frontend calls must use `withCredentials: true`.

## POST /api/v1/auth/login

Request

```json
{ "email": "admin@companyA.com", "password": "password123" }
```

Response `200` (token is set as an HttpOnly cookie, never in the body)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_001",
      "email": "admin@companya.com",
      "tenantId": "company_A",
      "role": "admin"
    }
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`.

## GET /api/v1/auth/me

Response `200`: `{ "success": true, "data": { "user": { ... } } }`
Errors: `401 UNAUTHENTICATED | INVALID_TOKEN | TOKEN_EXPIRED`.

## POST /api/v1/auth/logout

Response `200`: `{ "success": true, "message": "Logged out" }`

## GET /api/v1/tenants/current (Person 2)

```json
{ "success": true, "data": { "tenantId": "company_A", "databaseStatus": "connected" } }
```

## GET /health

```json
{ "success": true, "message": "LedgerGuard API is running" }
```

## Error codes

| Code                  | Status | Meaning                     |
| --------------------- | ------ | --------------------------- |
| `VALIDATION_ERROR`    | 400    | Body failed validation      |
| `INVALID_CREDENTIALS` | 401    | Wrong email or password     |
| `UNAUTHENTICATED`     | 401    | No token supplied           |
| `INVALID_TOKEN`       | 401    | Bad signature/claims/issuer |
| `TOKEN_EXPIRED`       | 401    | Token past expiry           |
| `NOT_FOUND`           | 404    | Unknown route               |
| `INTERNAL_ERROR`      | 500    | Unexpected server error     |

## Using contracts from the frontend

Import types from `shared/contracts/*` with a relative path or a Vite/TS path alias
(`@shared/*` -> `../shared/*`); they have no dependencies.
