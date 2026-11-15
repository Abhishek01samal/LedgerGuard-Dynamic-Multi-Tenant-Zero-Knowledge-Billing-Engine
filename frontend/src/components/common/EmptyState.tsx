import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mb-3 shadow-2xs">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-xs font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
