import { formatMinor } from '../../lib/money';
import type { UsageLimit } from '../../types/analytics.types';

export function UsageLimitCard({ data }: { data: UsageLimit }) {
  const pct = Math.min(100, data.usagePercentage);
  return (
    <article className="card animate-fade-up p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">Usage limit</p>
      <p className="mt-3 font-mono text-xl text-white">
        {formatMinor(data.usedMinor, data.currency)} / {formatMinor(data.limitMinor, data.currency)}
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink">
        <div
          className={`h-full rounded-full ${pct >= 80 ? 'bg-warn' : 'bg-accent'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-slate-400">
        {pct}% used · {formatMinor(data.remainingMinor, data.currency)} remaining this month
      </p>
    </article>
  );
}
