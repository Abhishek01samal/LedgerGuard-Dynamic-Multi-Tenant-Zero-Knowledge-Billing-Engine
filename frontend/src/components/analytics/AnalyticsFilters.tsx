import type { Period } from '../../types/analytics.types';

interface Props {
  period: Period;
  from: string;
  to: string;
  onPeriod: (period: Period) => void;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
}

export function AnalyticsFilters({ period, from, to, onPeriod, onFrom, onTo }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-xs text-slate-400">
        Period
        <select
          value={period}
          onChange={(e) => onPeriod(e.target.value as Period)}
          className="field text-slate-100"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs text-slate-400">
        From
        <input
          type="date"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          className="field text-slate-100"
        />
      </label>
      <label className="grid gap-1 text-xs text-slate-400">
        To
        <input
          type="date"
          value={to}
          onChange={(e) => onTo(e.target.value)}
          className="field text-slate-100"
        />
      </label>
    </div>
  );
}
