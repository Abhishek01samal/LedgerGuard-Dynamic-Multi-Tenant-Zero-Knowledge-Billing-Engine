import { useQuery } from '@tanstack/react-query';
import {
  getAnalyticsSummary,
  getExpenditure,
  getTransactionStats,
  getUsageStats,
  type DateRangeParams,
} from '../services/analytics.service';
import type { Period } from '../types/analytics.types';

export function useAnalytics(params: DateRangeParams, period: Period) {
  const summary = useQuery({
    queryKey: ['analytics', 'summary', params],
    queryFn: () => getAnalyticsSummary(params),
  });
  const expenditure = useQuery({
    queryKey: ['analytics', 'expenditure', params, period],
    queryFn: () => getExpenditure({ ...params, period }),
  });
  const usage = useQuery({
    queryKey: ['analytics', 'usage', params, period],
    queryFn: () => getUsageStats({ ...params, period }),
  });
  const stats = useQuery({
    queryKey: ['analytics', 'transactions', params],
    queryFn: () => getTransactionStats(params),
  });

  return { summary, expenditure, usage, stats };
}
