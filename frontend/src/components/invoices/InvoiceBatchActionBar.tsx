import React from 'react';
import { Button } from '../common/Button';
import { CheckCircle2, Download, Trash2, X } from 'lucide-react';

export interface InvoiceBatchActionBarProps {
  selectedCount: number;
  onBatchMarkPaid: () => void;
  onBatchExport: () => void;
  onBatchDelete: () => void;
  onDeselectAll: () => void;
}

export const InvoiceBatchActionBar: React.FC<InvoiceBatchActionBarProps> = ({
  selectedCount,
  onBatchMarkPaid,
  onBatchExport,
  onBatchDelete,
  onDeselectAll,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 inset-x-0 mx-auto max-w-xl z-30 px-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl p-3 border border-slate-700 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-[10px]">
            {selectedCount}
          </span>
          <span className="font-semibold text-slate-200">
            {selectedCount} {selectedCount === 1 ? 'invoice' : 'invoices'} selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBatchMarkPaid}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            className="text-slate-200 hover:text-white hover:bg-slate-800 text-xs py-1"
          >
            Mark Paid
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onBatchExport}
            leftIcon={<Download className="w-3.5 h-3.5 text-sky-400" />}
            className="text-slate-200 hover:text-white hover:bg-slate-800 text-xs py-1"
          >
            Export
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onBatchDelete}
            leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
            className="text-slate-200 hover:text-rose-300 hover:bg-slate-800 text-xs py-1"
          >
            Delete
          </Button>

          <div className="h-4 w-px bg-slate-700" />

          <button
            onClick={onDeselectAll}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Deselect all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
