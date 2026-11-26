import React from 'react';
import { Calendar } from 'lucide-react';

export type UniversalDatePreset = 'all' | 'today' | '7d' | '30d' | 'q4' | 'ytd';

export interface DateRangeFilterProps {
  value: UniversalDatePreset;
  onChange: (preset: UniversalDatePreset) => void;
  className?: string;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  className = '',
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="absolute left-2.5 pointer-events-none text-slate-400">
        <Calendar className="w-3.5 h-3.5" />
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as UniversalDatePreset)}
        className="text-xs pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-slate-900 cursor-pointer transition-colors shadow-2xs"
      >
        <option value="all">All Time</option>
        <option value="today">Today</option>
        <option value="7d">Last 7 Days</option>
        <option value="30d">Last 30 Days</option>
        <option value="q4">This Quarter (Q4)</option>
        <option value="ytd">Year to Date (YTD)</option>
      </select>
    </div>
  );
};
