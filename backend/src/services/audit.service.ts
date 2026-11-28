import { createLogger, format, transports } from 'winston';
import { env } from '../config/env';
import { getTenantConnection } from '../database/tenant.connection';
import { getAuditModel } from '../modules/logging/logging.model';
import type { AuditEventDoc, AuditEventType, AuditEventView } from '../modules/logging/logging.types';

const SENSITIVE = /authorization|cookie|password|token|secret|private.?key|api.?key/i;

export const logger = createLogger({
  level: env.logLevel,
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console({ silent: env.nodeEnv === 'test' })],
});

export function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    return SENSITIVE.test(value) ? '[REDACTED]' : value;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = SENSITIVE.test(key) ? '[REDACTED]' : redact(nested);
    }
    return out;
  }
  return value;
}

export async function recordAudit(event: Omit<AuditEventDoc, 'timestamp'> & { timestamp?: Date }): Promise<void> {
  const doc: AuditEventDoc = { ...event, timestamp: event.timestamp ?? new Date() };
  logger.info('audit', redact({ ...doc }) as Record<string, unknown>);
  if (!event.tenantId) return;
  try {
    const connection = await getTenantConnection(event.tenantId);
    const Audit = getAuditModel(connection);
    await Audit.create(doc);
  } catch (err) {
    logger.error('audit persist failed', { error: err instanceof Error ? err.message : 'unknown' });
  }
}

export async function listAuditEvents(tenantId: string, limit = 50): Promise<AuditEventView[]> {
  const connection = await getTenantConnection(tenantId);
  const Audit = getAuditModel(connection);
  const rows = await Audit.find({ tenantId }).sort({ timestamp: -1 }).limit(limit).lean();
  return rows.map((row) => ({
    traceId: row.traceId,
    tenantId: row.tenantId,
    event: row.event as AuditEventType,
    transactionId: row.transactionId ?? null,
    method: row.method,
    endpoint: row.endpoint,
    statusCode: row.statusCode,
    timestamp: row.timestamp.toISOString(),
    durationMs: row.durationMs,
  }));
}
