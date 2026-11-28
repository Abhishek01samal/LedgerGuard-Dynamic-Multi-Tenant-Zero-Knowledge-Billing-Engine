import axios, { type AxiosError } from 'axios';
import type { ApiErrorBody } from '../types/auth.types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  withCredentials: true,
  timeout: 20_000,
});

/** Demo mode is on by default in development; set VITE_USE_MOCK_DATA=false to use a real API. */
export function isMockMode(): boolean {
  return import.meta.env.VITE_USE_MOCK_DATA !== 'false' && import.meta.env.DEV;
}

export function getErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<ApiErrorBody>;
  return axiosErr.response?.data?.message ?? axiosErr.message ?? 'Something went wrong';
}

export function isUnauthorized(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401;
}

export function getErrorCode(err: unknown): string | undefined {
  const axiosErr = err as AxiosError<ApiErrorBody>;
  return axiosErr.response?.data?.code;
}
