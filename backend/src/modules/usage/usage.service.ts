import type { Connection } from 'mongoose';
import {
  calculateConsumedUsage,
  defaultMonthlyLimitMinor,
  remainingMinor,
  usagePercentage,
  usageWarningThreshold,
  utcMonthRange,
} from '../../services/usage-calculation.service';
import type { Currency } from '../ledger/ledger.types';
import { getUsageLimitModel } from './usage.model';
import type { UsageLimitView } from './usage.types';

export class UsageService {
  async getLimits(connection: Connection, tenantId: string, currency: Currency): Promise<UsageLimitView> {
    const Limit = getUsageLimitModel(connection);
    await Limit.init();

    const existing = await Limit.findOne({ tenantId, currency, period: 'monthly' }).lean();
    const limitMinor = existing?.limitMinor ?? defaultMonthlyLimitMinor();

    if (!existing) {
      await Limit.findOneAndUpdate(
        { tenantId, currency, period: 'monthly' },
        { $setOnInsert: { tenantId, currency, period: 'monthly', limitMinor } },
        { upsert: true, new: true },
      );
    }

    const { from, to } = utcMonthRange();
    const { usedMinor } = await calculateConsumedUsage(connection, tenantId, currency, from, to);
    const remaining = remainingMinor(limitMinor, usedMinor);
    const percentage = usagePercentage(limitMinor, usedMinor);

    return {
      currency,
      period: 'monthly',
      limitMinor,
      usedMinor,
      remainingMinor: remaining,
      usagePercentage: percentage,
      thresholdReached: percentage >= usageWarningThreshold(),
    };
  }

  /** Creates or replaces the tenant's monthly limit, then returns the recomputed view. */
  async upsertLimit(
    connection: Connection,
    tenantId: string,
    input: { currency: Currency; limitMinor: number; period: 'monthly' },
  ): Promise<UsageLimitView> {
    const Limit = getUsageLimitModel(connection);
    await Limit.init();
    await Limit.findOneAndUpdate(
      { tenantId, currency: input.currency, period: input.period },
      { $set: { limitMinor: input.limitMinor } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return this.getLimits(connection, tenantId, input.currency);
  }
}
