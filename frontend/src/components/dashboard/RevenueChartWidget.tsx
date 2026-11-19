import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { formatCurrency } from '../../utils/formatters';
import type { MonthlyRevenueData } from '../../types';
import { ShieldCheck, TrendingUp } from 'lucide-react';

export interface RevenueChartWidgetProps {
  data: MonthlyRevenueData[];
  timeframe: '6m' | 'ytd';
  onTimeframeChange: (tf: '6m' | 'ytd') => void;
  isLoading?: boolean;
}

export const RevenueChartWidget: React.FC<RevenueChartWidgetProps> = ({
  data,
  timeframe,
  onTimeframeChange,
  isLoading = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Compute maximum amount for dynamic vertical scaling
  const maxVal = Math.max(...data.map((d) => Math.max(d.invoiced, d.collected)), 40000);
  const roundedMax = Math.ceil(maxVal / 10000) * 10000;

  const totalInvoiced = data.reduce((sum, d) => sum + d.invoiced, 0);
  const totalCollected = data.reduce((sum, d) => sum + d.collected, 0);
  const overallEfficiency = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  if (isLoading) {
    return (
      <Card title="Revenue & Settlement Distribution" className="animate-pulse">
        <div className="h-64 bg-slate-100 rounded-lg" />
      </Card>
    );
  }

  return (
    <Card
      title="Revenue & Settlement Distribution"
      subtitle="Monthly invoicing vs cryptographically settled volume across tenant partitions"
      action={
        <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <Button
            variant={timeframe === '6m' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onTimeframeChange('6m')}
            className={`text-xs px-2.5 py-1 ${
              timeframe === '6m' ? 'bg-white shadow-xs font-semibold text-slate-900' : 'text-slate-600'
            }`}
          >
            Last 6 Months
          </Button>
          <Button
            variant={timeframe === 'ytd' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onTimeframeChange('ytd')}
            className={`text-xs px-2.5 py-1 ${
              timeframe === 'ytd' ? 'bg-white shadow-xs font-semibold text-slate-900' : 'text-slate-600'
            }`}
          >
            Year to Date (2026)
          </Button>
        </div>
      }
    >
      {/* Summary KPI Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 mb-6 bg-slate-50 border border-slate-200/80 rounded-lg text-xs">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-slate-400 text-[11px] block">Period Invoiced</span>
            <span className="font-bold text-slate-900 text-sm">{formatCurrency(totalInvoiced)}</span>
          </div>
          <div className="h-7 w-px bg-slate-200" />
          <div>
            <span className="text-slate-400 text-[11px] block">Period Settled</span>
            <span className="font-bold text-emerald-700 text-sm">{formatCurrency(totalCollected)}</span>
          </div>
          <div className="h-7 w-px bg-slate-200" />
          <div>
            <span className="text-slate-400 text-[11px] block">Settlement Efficiency</span>
            <div className="flex items-center gap-1 font-bold text-indigo-700 text-sm">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{overallEfficiency}%</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-700 inline-block" />
            <span className="text-slate-600 font-medium">Billed Invoiced</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            <span className="text-slate-600 font-medium">ZK Settled</span>
          </div>
        </div>
      </div>

      {/* SVG Financial Bar Chart Container */}
      <div className="relative pt-2 pb-6">
        {/* Horizontal grid lines */}
        <div className="absolute inset-x-0 top-2 bottom-10 flex flex-col justify-between pointer-events-none opacity-40">
          <div className="border-b border-dashed border-slate-200 w-full" />
          <div className="border-b border-dashed border-slate-200 w-full" />
          <div className="border-b border-dashed border-slate-200 w-full" />
          <div className="border-b border-slate-200 w-full" />
        </div>

        {/* Bar Columns Container */}
        <div className="relative h-56 flex items-end justify-between gap-2 sm:gap-4 px-2">
          {data.map((item, idx) => {
            const invoicedHeightPercent = Math.min(100, Math.round((item.invoiced / roundedMax) * 100));
            const collectedHeightPercent = Math.min(100, Math.round((item.collected / roundedMax) * 100));
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={item.month}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Floating Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-3 z-20 bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-left text-[11px] whitespace-nowrap min-w-[170px] pointer-events-none border border-slate-700 animate-in fade-in zoom-in-95 duration-100">
                    <div className="font-semibold text-slate-100 border-b border-slate-700 pb-1 mb-1.5">
                      {item.month}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between gap-3 text-slate-300">
                        <span>Total Invoiced:</span>
                        <span className="font-mono font-bold text-white">
                          {formatCurrency(item.invoiced)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 text-emerald-400">
                        <span>ZK Settled:</span>
                        <span className="font-mono font-bold">
                          {formatCurrency(item.collected)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-indigo-300 pt-1 border-t border-slate-800">
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-indigo-400" />
                          <span>ZK Proofs:</span>
                        </div>
                        <span className="font-mono">{item.proofsCount} generated</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bars Group */}
                <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full pb-1">
                  {/* Invoiced Bar */}
                  <div
                    style={{ height: `${invoicedHeightPercent}%` }}
                    className={`w-1/2 max-w-[20px] rounded-t-sm transition-all duration-200 ${
                      isHovered ? 'bg-slate-900' : 'bg-slate-700 group-hover:bg-slate-800'
                    }`}
                  />
                  {/* Settled Bar */}
                  <div
                    style={{ height: `${collectedHeightPercent}%` }}
                    className={`w-1/2 max-w-[20px] rounded-t-sm transition-all duration-200 ${
                      isHovered ? 'bg-emerald-400' : 'bg-emerald-500 group-hover:bg-emerald-400'
                    }`}
                  />
                </div>

                {/* Month Label */}
                <span
                  className={`mt-2 text-[10px] sm:text-[11px] truncate w-full text-center font-medium transition-colors ${
                    isHovered ? 'text-slate-900 font-bold' : 'text-slate-400'
                  }`}
                >
                  {item.month.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
