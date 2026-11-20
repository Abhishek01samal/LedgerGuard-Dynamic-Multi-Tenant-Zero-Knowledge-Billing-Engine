import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { formatCurrency } from '../../utils/formatters';
import type { PaymentChannelMetric } from '../../types';
import { Building2, Globe, CreditCard, ShieldCheck } from 'lucide-react';

export interface PaymentMethodsDistributionProps {
  channels: PaymentChannelMetric[];
  isLoading?: boolean;
}

export const PaymentMethodsDistribution: React.FC<PaymentMethodsDistributionProps> = ({
  channels,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card title="Settlement Rails & Channels" className="animate-pulse">
        <div className="h-44 bg-slate-100 rounded-lg" />
      </Card>
    );
  }

  const getChannelIcon = (ch: string) => {
    switch (ch) {
      case 'ach':
        return <Building2 className="w-4 h-4 text-emerald-600" />;
      case 'wire':
        return <Globe className="w-4 h-4 text-indigo-600" />;
      case 'card':
      default:
        return <CreditCard className="w-4 h-4 text-sky-600" />;
    }
  };

  const getChannelColor = (ch: string) => {
    switch (ch) {
      case 'ach':
        return 'bg-emerald-500';
      case 'wire':
        return 'bg-indigo-500';
      case 'card':
      default:
        return 'bg-sky-500';
    }
  };

  return (
    <Card
      title="Settlement Rails & Channels"
      subtitle="Volume distribution across multi-tenant enterprise payment rails"
      action={
        <Badge variant="zk" size="sm" icon={<ShieldCheck className="w-3 h-3 text-indigo-600" />}>
          ZK Verified Rails
        </Badge>
      }
    >
      <div className="space-y-4 text-xs">
        {channels.map((item) => (
          <div key={item.channel} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <div className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                  {getChannelIcon(item.channel)}
                </div>
                <span>{item.label}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-900 font-mono">
                  {formatCurrency(item.volume)}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {item.txCount} txs • {item.percentage}%
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${getChannelColor(item.channel)} transition-all duration-300`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
