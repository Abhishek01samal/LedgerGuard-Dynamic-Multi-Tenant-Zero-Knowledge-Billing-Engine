import { Schema, type Connection, type Model } from 'mongoose';
import type { AuditEventDoc } from './logging.types';

const auditSchema = new Schema<AuditEventDoc>(
  {
    traceId: { type: String, required: true },
    tenantId: { type: String, default: null },
    userId: { type: String, default: null },
    event: { type: String, required: true },
    transactionId: { type: String, default: null },
    method: { type: String, required: true },
    endpoint: { type: String, required: true },
    statusCode: { type: Number, required: true },
    durationMs: { type: Number, required: true },
    timestamp: { type: Date, required: true },
    message: { type: String },
  },
  { versionKey: false },
);

auditSchema.index({ tenantId: 1, timestamp: -1 });
auditSchema.index({ traceId: 1 });

export function getAuditModel(connection: Connection): Model<AuditEventDoc> {
  return (
    (connection.models.AuditEvent as Model<AuditEventDoc> | undefined) ??
    connection.model<AuditEventDoc>('AuditEvent', auditSchema, 'audit_events')
  );
}
