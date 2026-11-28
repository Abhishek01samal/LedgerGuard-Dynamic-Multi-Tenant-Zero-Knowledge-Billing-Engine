import { Schema, type Connection, type Model } from 'mongoose';
import type { UsageLimitDoc } from './usage.types';

const usageLimitSchema = new Schema<UsageLimitDoc>(
  {
    tenantId: { type: String, required: true },
    currency: { type: String, required: true },
    period: { type: String, enum: ['monthly'], required: true },
    limitMinor: { type: Number, required: true, min: 1 },
  },
  { timestamps: true, versionKey: false },
);

usageLimitSchema.index({ tenantId: 1, currency: 1, period: 1 }, { unique: true });

export function getUsageLimitModel(connection: Connection): Model<UsageLimitDoc> {
  return (
    (connection.models.UsageLimit as Model<UsageLimitDoc> | undefined) ??
    connection.model<UsageLimitDoc>('UsageLimit', usageLimitSchema, 'usage_limits')
  );
}
