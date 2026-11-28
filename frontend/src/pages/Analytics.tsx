import { format, startOfMonth } from 'date-fns';
import { useMemo, useState } from 'react';
import { AnalyticsFilters } from '../components/analytics/AnalyticsFilters';
import { AnalyticsSummary } from '../components/analytics/AnalyticsSummary';
import { ExpenditureChart } from '../components/analytics/ExpenditureChart';
import { TransactionStats } from '../components/analytics/TransactionStats';
import { UsageChart } from '../components/analytics/UsageChart';
import { UsageLimitCard } from '../components/analytics/UsageLimitCard';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useAnalytics } from '../hooks/useAnalytics';
import { useUsage } from '../hooks/useUsage';
import { getErrorMessage } from '../services/api';
import type { Period } from '../types/analytics.types';

export function Analytics() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const params = useMemo(() => ({ from, to, currency: 'INR' }), [from, to]);
  const analytics = useAnalytics(params, period);
  const usage = useUsage('INR');
  const loading = analytics.summary.isLoading || analytics.expenditure.isLoading;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">Analytics</p>
          <h1 className="mt-2 text-3xl font-semibold">Tenant expenditure</h1>
        </div>
        <AnalyticsFilters period={period} from={from} to={to} onPeriod={setPeriod} onFrom={setFrom} onTo={setTo} />
      </div>

      {loading ? <LoadingSpinner label="Aggregating ledger data" /> : null}
      {analytics.summary.error ? <ErrorMessage message={getErrorMessage(analytics.summary.error)} /> : null}
      {analytics.summary.data ? <AnalyticsSummary data={analytics.summary.data} /> : null}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="card animate-fade-up p-5">
          <h2 className="mb-4 text-lg font-medium">Historical expenditure</h2>
          {analytics.expenditure.data ? <ExpenditureChart data={analytics.expenditure.data} /> : null}
        </section>
        {usage.data ? <UsageLimitCard data={usage.data} /> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card animate-fade-up p-5">
          <h2 className="mb-4 text-lg font-medium">Usage</h2>
          {analytics.usage.data ? <UsageChart data={analytics.usage.data} /> : null}
        </section>
        <section className="card animate-fade-up p-5">
          <h2 className="mb-4 text-lg font-medium">Transaction statistics</h2>
          {analytics.stats.data ? <TransactionStats data={analytics.stats.data} /> : null}
        </section>
      </div>
    </div>
  );
}
