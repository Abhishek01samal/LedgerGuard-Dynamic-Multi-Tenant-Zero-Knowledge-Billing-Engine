import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from './error.middleware';
import { getTenantContext } from './auth.middleware';
import {
  assertFreshTimestamp,
  canonicalString,
  consumeNonce,
  hashBody,
  verifySignature,
} from '../modules/security/signature.service';

/**
 * Verifies RSA-SHA256 request signatures.
 * JWT auth is separate: a valid token does not prove the body was not altered.
 * Browser billing uses JWT only unless REQUIRE_REQUEST_SIGNATURE=true.
 */
export const requireRequestSignature: RequestHandler = async (req, _res, next) => {
  if (!env.requireRequestSignature) {
    next();
    return;
  }

  try {
    const signature = req.header('X-Signature');
    const timestamp = req.header('X-Timestamp');
    const nonce = req.header('X-Nonce');
    if (!signature || !timestamp || !nonce) {
      throw new AppError(401, 'Request signature required', 'SIGNATURE_MISSING');
    }

    assertFreshTimestamp(timestamp);
    const { tenantId } = getTenantContext(req);
    await consumeNonce(nonce, tenantId);

    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    const payload = canonicalString({
      method: req.method,
      path: req.originalUrl.split('?')[0] ?? req.path,
      timestamp,
      nonce,
      bodyHash: hashBody(raw),
    });

    if (!verifySignature(payload, signature)) {
      throw new AppError(401, 'Invalid request signature', 'INVALID_SIGNATURE');
    }
    next();
  } catch (err) {
    next(err);
  }
};
