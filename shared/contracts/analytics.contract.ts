export type Period = 'daily' | 'weekly' | 'monthly';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface AnalyticsSummaryDTO {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalExpenditure: number;
  currency: string;
  successRate: number;
}

export interface ExpenditurePointDTO {
  label: string;
  date: string;
  amountMinor: number;
}

export interface ExpenditureDTO {
  currency: string;
  period: Period;
  points: ExpenditurePointDTO[];
}

export interface UsagePointDTO {
  date: string;
  transactions: number;
  successful: number;
  failed: number;
}

export interface UsageStatsDTO {
  period: Period;
  points: UsagePointDTO[];
}

export interface TransactionStatsDTO {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  successRate: number;
  failureRate: number;
}

export interface UsageLimitDTO {
  currency: string;
  period: 'monthly';
  limitMinor: number;
  usedMinor: number;
  remainingMinor: number;
  usagePercentage: number;
  thresholdReached?: boolean;
}
