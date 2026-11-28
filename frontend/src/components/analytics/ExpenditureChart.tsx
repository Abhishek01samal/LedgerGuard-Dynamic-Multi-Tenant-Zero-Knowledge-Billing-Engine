import { Line } from 'react-chartjs-2';
import '../../lib/chart';
import { fromMinor } from '../../lib/money';
import type { ExpenditureData } from '../../types/analytics.types';
import { EmptyState } from '../common/EmptyState';

export function ExpenditureChart({ data }: { data: ExpenditureData }) {
  const hasValues = data.points.some((p) => p.amountMinor > 0);
  if (!hasValues) {
    return <EmptyState title="No expenditure yet" body="Completed transactions in this range will appear here." />;
  }

  return (
    <div className="h-72">
      <Line
        data={{
          labels: data.points.map((p) => p.label),
          datasets: [
            {
              label: `Expenditure (${data.currency})`,
              data: data.points.map((p) => fromMinor(p.amountMinor)),
              borderColor: '#ffffff',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              fill: true,
              tension: 0.35,
              pointRadius: 3,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } },
        }}
      />
    </div>
  );
}
