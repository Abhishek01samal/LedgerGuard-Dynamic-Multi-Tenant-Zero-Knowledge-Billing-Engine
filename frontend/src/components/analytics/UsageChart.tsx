import { Bar } from 'react-chartjs-2';
import '../../lib/chart';
import type { UsageStatsData } from '../../types/analytics.types';
import { EmptyState } from '../common/EmptyState';

export function UsageChart({ data }: { data: UsageStatsData }) {
  if (!data.points.some((p) => p.transactions > 0)) {
    return <EmptyState title="No usage in this range" body="Create billing transactions to populate this chart." />;
  }

  return (
    <div className="h-72">
      <Bar
        data={{
          labels: data.points.map((p) => p.date),
          datasets: [
            {
              label: 'Completed',
              data: data.points.map((p) => p.successful),
              backgroundColor: '#ffffff',
            },
            {
              label: 'Failed',
              data: data.points.map((p) => p.failed),
              backgroundColor: '#7a7a7a',
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
        }}
      />
    </div>
  );
}
