import type { Connection } from 'mongoose';
import { getLedgerModels } from '../modules/ledger/ledger.model';
import type { Currency } from '../modules/ledger/ledger.types';
import type { UsageSnapshot } from '../modules/usage/usage.types';

const DEFAULT_MONTHLY_LIMIT_MINOR = 500_000;
const WARNING_THRESHOLD = 80;

export function defaultMonthlyLimitMinor(): number {
  return DEFAULT_MONTHLY_LIMIT_MINOR;
}

export function usageWarningThreshold(): number {
  return WARNING_THRESHOLD;
}

/** UTC calendar month containing `now`. */
export function utcMonthRange(now = new Date()): { from: Date; to: Date } {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { from, to };
}

export function remainingMinor(limitMinor: number, usedMinor: number): number {
  return Math.max(0, limitMinor - usedMinor);
}

export function usagePercentage(limitMinor: number, usedMinor: number): number {
  if (limitMinor <= 0) return 0;
  return Math.round((usedMinor / limitMinor) * 10000) / 100;
}

/**
 * Sum COMPLETED transaction amounts for one currency in a range.
 * Does not mix currencies. Counts ledger transactions, not debit+credit entries.
 */
export async function calculateConsumedUsage(
  connection: Connection,
  tenantId: string,
  currency: Currency,
  from: Date,
  to: Date,
): Promise<UsageSnapshot> {
  const { Transaction } = getLedgerModels(connection);
  const rows = await Transaction.aggregate<{ usedMinor: number }>([
    {
      $match: {
        tenantId,
        currency,
        status: 'COMPLETED',
        createdAt: { $gte: from, $lt: to },
      },
    },
    { $group: { _id: null, usedMinor: { $sum: '$amountMinor' } } },
  ]);
  return { usedMinor: rows[0]?.usedMinor ?? 0, from, to };
}
