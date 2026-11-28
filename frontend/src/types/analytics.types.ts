export type Period = 'daily' | 'weekly' | 'monthly';

export interface AnalyticsSummary {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalExpenditure: number;
  currency: string;
  successRate: number;
}

export interface ExpenditureData {
  currency: string;
  period: Period;
  points: { label: string; date: string; amountMinor: number }[];
}

export interface UsageStatsData {
  period: Period;
  points: { date: string; transactions: number; successful: number; failed: number }[];
}

export interface TransactionStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  successRate: number;
  failureRate: number;
}

export interface UsageLimit {
  currency: string;
  period: 'monthly';
  limitMinor: number;
  usedMinor: number;
  remainingMinor: number;
  usagePercentage: number;
  thresholdReached?: boolean;
}
