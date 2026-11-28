export type AuditEventType =
  | 'REQUEST'
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE'
  | 'TRANSACTION_STARTED'
  | 'TRANSACTION_COMPLETED'
  | 'TRANSACTION_FAILED'
  | 'TRANSACTION_REPLAYED';

export interface AuditEventDoc {
  traceId: string;
  tenantId: string | null;
  userId: string | null;
  event: AuditEventType;
  transactionId?: string | null;
  method: string;
  endpoint: string;
  statusCode: number;
  durationMs: number;
  timestamp: Date;
  message?: string;
}

export interface AuditEventView {
  traceId: string;
  tenantId: string | null;
  event: AuditEventType;
  transactionId: string | null;
  method: string;
  endpoint: string;
  statusCode: number;
  timestamp: string;
  durationMs: number;
}
