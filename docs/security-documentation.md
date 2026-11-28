# Security

## Authentication

Access tokens are signed with RS256. Verification requires the public key, issuer `ledgerguard`, and audience `ledgerguard-api`. Expired tokens return `TOKEN_EXPIRED`.

The browser never receives the RSA private key. Login sets an httpOnly cookie (`lg_token`) and also works with `Authorization: Bearer`.

## Request signatures vs JWT

JWT proves who the caller is. It does not prove the JSON body was unmodified. Optional middleware `requireRequestSignature` checks `X-Signature`, `X-Timestamp`, and `X-Nonce` against a canonical payload:

```
METHOD
PATH
TIMESTAMP
NONCE
SHA256(body)
```

Replay protection stores nonces in Redis (or memory if Redis is down). Timestamps older than five minutes are rejected.

## Receipt signatures

After a ledger write, `GET /api/v1/security/receipt/:transactionId` signs `{ tenantId, transactionId, eventId, amountMinor, currency, status, signedAt }` with RSA-SHA256. Only the owning tenant can fetch a receipt.

## Logging

Passwords, tokens, cookies, and private keys are redacted. Audit rows live in the tenant database (`audit_events`).
