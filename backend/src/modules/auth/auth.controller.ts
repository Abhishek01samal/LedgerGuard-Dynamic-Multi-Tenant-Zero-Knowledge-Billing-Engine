import type { CookieOptions, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { recordAudit } from '../../services/audit.service';
import { getUserById, login } from './auth.service';
import { loginSchema } from './auth.validation';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: 15 * 60 * 1000, // keep in step with JWT_EXPIRES_IN
};

export const loginHandler: RequestHandler = async (req, res, next) => {
  const started = Date.now();
  try {
    const { email, password } = loginSchema.parse(req.body);
    const { user, token } = await login(email, password);
    res.cookie(env.cookieName, token, cookieOptions);
    void recordAudit({
      traceId: res.locals.traceId ?? 'unknown',
      tenantId: user.tenantId,
      userId: user.id,
      event: 'AUTH_SUCCESS',
      method: req.method,
      endpoint: req.originalUrl,
      statusCode: 200,
      durationMs: Date.now() - started,
    });
    res.status(200).json({ success: true, message: 'Login successful', data: { user } });
  } catch (err) {
    void recordAudit({
      traceId: res.locals.traceId ?? 'unknown',
      tenantId: null,
      userId: null,
      event: 'AUTH_FAILURE',
      method: req.method,
      endpoint: req.originalUrl,
      statusCode: err instanceof AppError ? err.statusCode : err instanceof ZodError ? 400 : 500,
      durationMs: Date.now() - started,
      message:
        err instanceof AppError ? err.code : err instanceof ZodError ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
    });
    next(err);
  }
};

export const logoutHandler: RequestHandler = (_req, res) => {
  res.clearCookie(env.cookieName, { path: '/', httpOnly: true, secure: env.isProduction, sameSite: 'lax' });
  res.status(200).json({ success: true, message: 'Logged out' });
};

export const meHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
    const user = await getUserById(req.auth.sub);
    if (!user) throw new AppError(401, 'User no longer exists', 'UNAUTHENTICATED');
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};
