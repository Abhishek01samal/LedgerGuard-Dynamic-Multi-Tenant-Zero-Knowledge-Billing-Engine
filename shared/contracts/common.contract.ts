export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiErrorItem {
  path: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  errors?: ApiErrorItem[];
  detail?: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface HealthResponse {
  success: true;
  message: 'LedgerGuard API is running';
}

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
  return isRecord(value) && value.success === true && value.message === 'LedgerGuard API is running';
}

