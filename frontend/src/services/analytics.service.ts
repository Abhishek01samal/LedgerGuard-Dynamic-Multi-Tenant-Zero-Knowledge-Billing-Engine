import type {
  AnalyticsSummary,
  ExpenditureData,
  Period,
  TransactionStats,
  UsageLimit,
  UsageStatsData,
} from '../types/analytics.types';
import { api, isMockMode } from './api';
import {
  demoExpenditure,
  demoLimits,
  demoStats,
  demoSummary,
  demoUsage,
  getDemoUser,
} from './mock-data';

export interface DateRangeParams {
  from?: string;
  to?: string;
  currency?: string;
}

function demoUser() {
  const user = getDemoUser();
  if (!user) throw new Error('No demo session. Sign in again.');
  return user;
}

export async function getAnalyticsSummary(params: DateRangeParams): Promise<AnalyticsSummary> {
  if (isMockMode()) return demoSummary(demoUser(), params);
  const { data } = await api.get('/api/v1/analytics/summary', { params });
  return data.data;
}

export async function getExpenditure(params: DateRangeParams & { period: Period; year?: number }): Promise<ExpenditureData> {
  if (isMockMode()) return demoExpenditure(demoUser(), params);
  const { data } = await api.get('/api/v1/analytics/expenditure', { params });
  return data.data;
}

export async function getUsageStats(params: DateRangeParams & { period: Period }): Promise<UsageStatsData> {
  if (isMockMode()) return demoUsage(demoUser(), params);
  const { data } = await api.get('/api/v1/analytics/usage', { params });
  return data.data;
}

export async function getTransactionStats(params: DateRangeParams): Promise<TransactionStats> {
  if (isMockMode()) return demoStats(demoUser(), params);
  const { data } = await api.get('/api/v1/analytics/transactions', { params });
  return data.data;
}

export async function getUsageLimits(currency = 'INR'): Promise<UsageLimit> {
  if (isMockMode()) return demoLimits(demoUser(), currency);
  const { data } = await api.get('/api/v1/usage/limits', { params: { currency } });
  return data.data;
}
