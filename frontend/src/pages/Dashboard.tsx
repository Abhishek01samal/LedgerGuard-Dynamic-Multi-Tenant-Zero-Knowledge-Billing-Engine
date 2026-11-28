import { Link } from 'react-router-dom';
import { AnalyticsSummary } from '../components/analytics/AnalyticsSummary';
import { UsageLimitCard } from '../components/analytics/UsageLimitCard';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useAnalytics } from '../hooks/useAnalytics';
import { useUsage } from '../hooks/useUsage';
import { getErrorMessage } from '../services/api';
import { useAuth } from '../routes/AuthContext';
import { format, startOfMonth } from 'date-fns';

export function Dashboard() {
  const { user } = useAuth();
  const from = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const to = format(new Date(), 'yyyy-MM-dd');
  const analytics = useAnalytics({ from, to, currency: 'INR' }, 'daily');
  const usage = useUsage('INR');

  return (
    <div className="grid gap-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">{user?.tenantId}</p>
        <h1 className="mt-2 text-3xl font-semibold">Operations dashboard</h1>
      </header>
      {analytics.summary.isLoading ? <LoadingSpinner label="Loading tenant metrics" /> : null}
      {analytics.summary.error ? <ErrorMessage message={getErrorMessage(analytics.summary.error)} /> : null}
      {analytics.summary.data ? <AnalyticsSummary data={analytics.summary.data} /> : null}
      {usage.data ? <UsageLimitCard data={usage.data} /> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/billing" className="card button animate-fade-up p-5 hover:border-white/60">
          Create a billing entry
        </Link>
        <Link to="/ledger" className="card button animate-fade-up p-5 hover:border-white/60">
          Open the ledger
        </Link>
        <Link to="/analytics" className="card button animate-fade-up p-5 hover:border-white/60">
          Historical analytics
        </Link>
      </div>
    </div>
  );
}
