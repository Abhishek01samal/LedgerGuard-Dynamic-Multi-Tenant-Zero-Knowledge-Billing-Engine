/** Contracts shared by backend, frontend and tests. Dependency-free on purpose. */

export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiFieldError {
  path: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  errors?: ApiFieldError[];
}

export interface HealthResponse {
  success: true;
  message: string;
}

export const HEALTH_ROUTE = '/health' as const;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    isRecord(value) &&
    value.success === false &&
    typeof value.message === 'string' &&
    typeof value.code === 'string'
  );
}

export function isHealthResponse(value: unknown): value is HealthResponse {
  return isRecord(value) && value.success === true && typeof value.message === 'string';
}
