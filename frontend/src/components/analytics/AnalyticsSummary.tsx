import { formatMinor } from '../../lib/money';
import type { AnalyticsSummary as Summary } from '../../types/analytics.types';

export function AnalyticsSummary({ data }: { data: Summary }) {
  const cards = [
    { label: 'Total expenditure', value: formatMinor(data.totalExpenditure, data.currency), hint: data.currency },
    { label: 'Total transactions', value: String(data.totalTransactions), hint: 'All statuses' },
    { label: 'Success rate', value: `${data.successRate}%`, hint: `${data.successfulTransactions} completed` },
    { label: 'Failed transactions', value: String(data.failedTransactions), hint: 'Not counted in spend' },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.label} className="card animate-fade-up p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400">{card.label}</p>
          <p className="mt-3 font-mono text-2xl font-medium text-white">{card.value}</p>
          <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
        </article>
      ))}
    </div>
  );
}
