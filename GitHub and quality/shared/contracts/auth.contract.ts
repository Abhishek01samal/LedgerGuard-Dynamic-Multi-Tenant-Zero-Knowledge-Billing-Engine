import { isRecord } from './common.contract';

export type Role = 'admin' | 'member';

export interface AuthUserDto {
  id: string;
  email: string;
  tenantId: string;
  role: Role;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: true;
  message: string;
  data: { user: AuthUserDto };
}

export interface MeResponse {
  success: true;
  data: { user: AuthUserDto };
}

export const AUTH_ROUTES = {
  login: '/api/v1/auth/login',
  logout: '/api/v1/auth/logout',
  me: '/api/v1/auth/me',
} as const;

/** Error codes the frontend can branch on. */
export const AUTH_ERROR_CODES = {
  invalidCredentials: 'INVALID_CREDENTIALS',
  unauthenticated: 'UNAUTHENTICATED',
  invalidToken: 'INVALID_TOKEN',
  tokenExpired: 'TOKEN_EXPIRED',
  validation: 'VALIDATION_ERROR',
} as const;

export function isAuthUserDto(value: unknown): value is AuthUserDto {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.email === 'string' &&
    typeof value.tenantId === 'string' &&
    (value.role === 'admin' || value.role === 'member') &&
    // the contract forbids leaking secrets
    !('password' in value) &&
    !('passwordHash' in value)
  );
}

export function isLoginResponse(value: unknown): value is LoginResponse {
  return (
    isRecord(value) &&
    value.success === true &&
    typeof value.message === 'string' &&
    isRecord(value.data) &&
    isAuthUserDto(value.data.user)
  );
}

export function isMeResponse(value: unknown): value is MeResponse {
  return (
    isRecord(value) &&
    value.success === true &&
    isRecord(value.data) &&
    isAuthUserDto(value.data.user)
  );
}
