import React from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { formatCurrency } from '../../utils/formatters';
import type { FinancialSummaryDetail } from '../../types';
import { FileSpreadsheet, CheckCircle2, Clock, AlertTriangle, FileText } from 'lucide-react';

export interface RevenueBreakdownWidgetProps {
  summary: FinancialSummaryDetail;
  isNetMode: boolean;
  onToggleMode: () => void;
  onViewSummaryModal: () => void;
  isLoading?: boolean;
}

export const RevenueBreakdownWidget: React.FC<RevenueBreakdownWidgetProps> = ({
  summary,
  isNetMode,
  onToggleMode,
  onViewSummaryModal,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card title="Cashflow & Receivables Breakdown" className="animate-pulse">
        <div className="h-48 bg-slate-100 rounded-lg" />
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'pending':
        return <Clock className="w-3.5 h-3.5 text-amber-600" />;
      case 'overdue':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />;
      case 'draft':
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <Card
      title="Cashflow & Status Distribution"
      subtitle="Comprehensive breakdown of paid collections, pending receivables, and aging buckets"
      action={
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => isNetMode && onToggleMode()}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                !isNetMode
                  ? 'bg-white shadow-xs text-slate-900'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Gross
            </button>
            <button
              onClick={() => !isNetMode && onToggleMode()}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                isNetMode
                  ? 'bg-white shadow-xs text-slate-900'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Net (After Tax)
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onViewSummaryModal}
            leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />}
            className="text-xs"
          >
            Audit Statement
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Total Summary Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">
              {isNetMode ? 'Net Realized Revenue' : 'Gross Billed Volume'}
            </span>
            <span className="text-base font-bold text-slate-900 font-sans">
              {formatCurrency(summary.grossVolume)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Estimated Tax & Fees</span>
            <span className="text-base font-bold text-slate-700 font-sans">
              {formatCurrency(summary.taxAndFees)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Collection Efficiency</span>
            <span className="text-base font-bold text-emerald-700 font-sans">
              {summary.collectionEfficiency}%
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">At-Risk Default</span>
            <span className="text-base font-bold text-rose-600 font-sans">
              {formatCurrency(summary.overdueVolume)}
            </span>
          </div>
        </div>

        {/* Stacked Multi-Segment Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5 font-medium">
            <span>Portfolio Status Split</span>
            <span className="text-slate-400 text-[11px]">100% Partition Allocation</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden border border-slate-200">
            {summary.statusBreakdown.map((item) => (
              <div
                key={item.status}
                style={{ width: `${Math.max(item.percentage, 2)}%` }}
                className={`${item.color} h-full transition-all duration-300 hover:opacity-90`}
                title={`${item.label}: ${formatCurrency(item.amount)} (${item.percentage}%)`}
              />
            ))}
          </div>
        </div>

        {/* Status Rows Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {summary.statusBreakdown.map((item) => (
            <div
              key={item.status}
              className="p-2.5 rounded-lg border border-slate-100 bg-white hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  {getStatusIcon(item.status)}
                  <span className="truncate">{item.label}</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">{item.percentage}%</span>
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1">
                {formatCurrency(item.amount)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {item.count} {item.count === 1 ? 'invoice' : 'invoices'}
              </div>
            </div>
          ))}
        </div>

        {/* Receivables Aging Buckets */}
        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
            <span>Outstanding Receivables Aging Analysis</span>
            <span className="text-[11px] text-slate-400 font-normal">
              Based on payment terms net 30/60/90
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">0 - 30 Days (Current)</span>
              <span className="font-bold text-slate-900 font-mono">
                {formatCurrency(summary.receivablesAging.current0To30)}
              </span>
            </div>
            <div className="p-2 rounded bg-amber-50/50 border border-amber-200 text-amber-900">
              <span className="text-[10px] text-amber-600 block font-medium">31 - 60 Days (Grace)</span>
              <span className="font-bold text-amber-800 font-mono">
                {formatCurrency(summary.receivablesAging.days31To60)}
              </span>
            </div>
            <div className="p-2 rounded bg-orange-50/50 border border-orange-200 text-orange-900">
              <span className="text-[10px] text-orange-600 block font-medium">61 - 90 Days (Late)</span>
              <span className="font-bold text-orange-800 font-mono">
                {formatCurrency(summary.receivablesAging.days61To90)}
              </span>
            </div>
            <div className="p-2 rounded bg-rose-50/50 border border-rose-200 text-rose-900">
              <span className="text-[10px] text-rose-600 block font-medium">&gt; 90 Days (Default Risk)</span>
              <span className="font-bold text-rose-700 font-mono">
                {formatCurrency(summary.receivablesAging.over90Days)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
