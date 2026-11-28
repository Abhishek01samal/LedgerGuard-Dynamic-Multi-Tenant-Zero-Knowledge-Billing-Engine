import { Doughnut } from 'react-chartjs-2';
import '../../lib/chart';
import type { TransactionStats as Stats } from '../../types/analytics.types';

export function TransactionStats({ data }: { data: Stats }) {
  return (
    <div className="grid gap-6 md:grid-cols-[180px_1fr] md:items-center">
      <div className="h-40">
        <Doughnut
          data={{
            labels: ['Completed', 'Failed', 'Pending'],
            datasets: [
              {
                data: [data.completed, data.failed, data.pending],
                backgroundColor: ['#ffffff', '#a3a3a3', '#5c5c5c'],
                borderWidth: 0,
              },
            ],
          }}
          options={{ plugins: { legend: { display: false } }, cutout: '68%' }}
        />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-400">Completed</dt>
          <dd className="font-mono text-lg">{data.completed}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Failed</dt>
          <dd className="font-mono text-lg">{data.failed}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Success rate</dt>
          <dd className="font-mono text-lg">{data.successRate}%</dd>
        </div>
        <div>
          <dt className="text-slate-400">Failure rate</dt>
          <dd className="font-mono text-lg">{data.failureRate}%</dd>
        </div>
      </dl>
    </div>
  );
}
