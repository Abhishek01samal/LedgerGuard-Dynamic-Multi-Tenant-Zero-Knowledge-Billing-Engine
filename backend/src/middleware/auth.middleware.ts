import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from './error.middleware';
import { verifyToken } from '../modules/auth/auth.service';
import type { TokenClaims } from '../modules/auth/auth.validation';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by requireAuth. tenantId comes ONLY from the verified JWT. */
    auth?: TokenClaims;
  }
}

function extractToken(cookies: Record<string, unknown>, header: string | undefined): string | null {
  const fromCookie = cookies[env.cookieName];
  if (typeof fromCookie === 'string' && fromCookie.length > 0) return fromCookie;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = extractToken(req.cookies ?? {}, req.headers.authorization);
  if (!token) {
    next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
    return;
  }
  try {
    req.auth = verifyToken(token);
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Hand-off point for Person 2: use inside tenant-scoped routes after requireAuth.
 *   const { tenantId } = getTenantContext(req);
 *   const conn = await getTenantConnection(tenantId);
 */
export function getTenantContext(req: { auth?: TokenClaims }): { tenantId: string; userId: string } {
  if (!req.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  return { tenantId: req.auth.tenantId, userId: req.auth.sub };
}
