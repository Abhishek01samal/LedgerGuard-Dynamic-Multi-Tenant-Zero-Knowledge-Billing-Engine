import type { CookieOptions, RequestHandler } from 'express';
import { env } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
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
  try {
    const { email, password } = loginSchema.parse(req.body);
    const { user, token } = await login(email, password);
    res.cookie(env.cookieName, token, cookieOptions);
    res.status(200).json({ success: true, message: 'Login successful', data: { user } });
  } catch (err) {
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
