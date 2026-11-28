import type { Currency } from '../ledger/ledger.types';

export type UsagePeriod = 'monthly';

export interface UsageLimitDoc {
  tenantId: string;
  currency: Currency;
  period: UsagePeriod;
  limitMinor: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageLimitView {
  currency: Currency;
  period: UsagePeriod;
  limitMinor: number;
  usedMinor: number;
  remainingMinor: number;
  usagePercentage: number;
  thresholdReached: boolean;
}

export interface UsageSnapshot {
  usedMinor: number;
  from: Date;
  to: Date;
}
