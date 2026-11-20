import React, { useState } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import type { DateRangeFilter, DateRangePreset } from '../../types';

export interface DateRangeSelectorProps {
  currentFilter: DateRangeFilter;
  onFilterChange: (filter: DateRangeFilter) => void;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  currentFilter,
  onFilterChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState(currentFilter.startDate);
  const [customEnd, setCustomEnd] = useState(currentFilter.endDate);

  const presets: { id: DateRangePreset; label: string; start: string; end: string }[] = [
    { id: '7d', label: 'Last 7 Days', start: '2026-11-13', end: '2026-11-20' },
    { id: '30d', label: 'Last 30 Days', start: '2026-10-21', end: '2026-11-20' },
    { id: 'q4', label: 'Q4 2026', start: '2026-10-01', end: '2026-12-31' },
    { id: 'ytd', label: 'Year to Date (2026)', start: '2026-01-01', end: '2026-11-20' },
    { id: 'custom', label: 'Custom Date Range', start: customStart, end: customEnd },
  ];

  const handleSelectPreset = (preset: typeof presets[0]) => {
    if (preset.id === 'custom') {
      onFilterChange({
        preset: 'custom',
        startDate: customStart,
        endDate: customEnd,
        comparison: currentFilter.comparison,
      });
    } else {
      onFilterChange({
        preset: preset.id,
        startDate: preset.start,
        endDate: preset.end,
        comparison: currentFilter.comparison,
      });
    }
    setIsOpen(false);
  };

  const currentLabel =
    presets.find((p) => p.id === currentFilter.preset)?.label || 'Last 30 Days';

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-xs">
        {/* Preset Button Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-slate-800 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors"
        >
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>{currentLabel}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        <div className="h-4 w-px bg-slate-200" />

        {/* Period Comparison Toggle */}
        <select
          value={currentFilter.comparison}
          onChange={(e) =>
            onFilterChange({
              ...currentFilter,
              comparison: e.target.value as 'previous_period' | 'previous_year',
            })
          }
          className="text-xs bg-transparent border-0 text-slate-600 font-medium py-1 pr-6 pl-2 focus:ring-0 focus:outline-none cursor-pointer"
        >
          <option value="previous_period">vs Previous Period</option>
          <option value="previous_year">vs Previous Year (YoY)</option>
        </select>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 rounded-lg bg-white border border-slate-200 shadow-lg py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Select Time Range
          </div>
          <div className="divide-y divide-slate-100">
            <div className="py-1">
              {presets.slice(0, 4).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span className={currentFilter.preset === preset.id ? 'font-bold text-slate-900' : ''}>
                    {preset.label}
                  </span>
                  {currentFilter.preset === preset.id && (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </button>
              ))}
            </div>

            {/* Custom Range Inputs */}
            <div className="p-3 bg-slate-50/70 space-y-2">
              <span className="text-[11px] font-semibold text-slate-700 block">
                Custom Range
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Start Date</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full text-[11px] px-2 py-1 border border-slate-200 rounded bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">End Date</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full text-[11px] px-2 py-1 border border-slate-200 rounded bg-white text-slate-800"
                  />
                </div>
              </div>
              <button
                onClick={() =>
                  handleSelectPreset({
                    id: 'custom',
                    label: 'Custom Range',
                    start: customStart,
                    end: customEnd,
                  })
                }
                className="w-full mt-1 px-3 py-1 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 transition-colors"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
