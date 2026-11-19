import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge, type BadgeVariant } from '../common/Badge';

export interface MetricCardProps {
  title: string;
  value: string | number;
  delta?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  icon: LucideIcon;
  iconBgColor?: string;
  iconTextColor?: string;
  subtext?: string;
  badge?: {
    text: string;
    variant?: BadgeVariant;
  };
  isLoading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  delta,
  icon: Icon,
  iconBgColor = 'bg-slate-100',
  iconTextColor = 'text-slate-700',
  subtext,
  badge,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 bg-slate-200 rounded" />
          <div className="w-8 h-8 rounded-lg bg-slate-200" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-7 w-32 bg-slate-200 rounded" />
          <div className="h-3 w-28 bg-slate-200 rounded" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="hover:border-slate-300 transition-all duration-150">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider text-[11px]">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {badge && (
            <Badge variant={badge.variant || 'neutral'} size="sm">
              {badge.text}
            </Badge>
          )}
          <div
            className={`w-8 h-8 rounded-lg ${iconBgColor} ${iconTextColor} flex items-center justify-center shrink-0`}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
          {value}
        </div>

        <div className="flex items-center gap-2 mt-1.5 text-xs">
          {delta && (
            <div
              className={`flex items-center gap-0.5 font-semibold ${
                delta.isPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {delta.isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              <span>{delta.value}</span>
            </div>
          )}

          {delta?.label && (
            <span className="text-slate-400 text-[11px] font-normal">{delta.label}</span>
          )}

          {subtext && !delta && (
            <span className="text-slate-500 text-[11px] font-normal">{subtext}</span>
          )}
        </div>
      </div>
    </Card>
  );
};
