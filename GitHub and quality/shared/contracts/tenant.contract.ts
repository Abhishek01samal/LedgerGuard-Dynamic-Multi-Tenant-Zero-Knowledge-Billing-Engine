import { isRecord } from './common.contract';

export type DatabaseStatus = 'connected' | 'disconnected' | 'error';

export interface TenantCurrentResponse {
  success: true;
  data: { tenantId: string; databaseStatus: DatabaseStatus };
}

export const TENANT_ROUTES = {
  current: '/api/v1/tenants/current',
} as const;

export function isTenantCurrentResponse(value: unknown): value is TenantCurrentResponse {
  return (
    isRecord(value) &&
    value.success === true &&
    isRecord(value.data) &&
    typeof value.data.tenantId === 'string' &&
    (value.data.databaseStatus === 'connected' ||
      value.data.databaseStatus === 'disconnected' ||
      value.data.databaseStatus === 'error')
  );
}
