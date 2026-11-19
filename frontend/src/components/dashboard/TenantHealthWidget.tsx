import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Database, Cpu, Activity, CheckCircle2, Shield } from 'lucide-react';
import type { TenantPartitionHealth } from '../../types';

export interface TenantHealthWidgetProps {
  health: TenantPartitionHealth;
  tenantName?: string;
  isLoading?: boolean;
}

export const TenantHealthWidget: React.FC<TenantHealthWidgetProps> = ({
  health,
  tenantName = 'Active Tenant',
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card title="Tenant Partition & Engine Health" className="animate-pulse">
        <div className="h-48 bg-slate-100 rounded-lg" />
      </Card>
    );
  }

  const quotaPercent = Math.round((health.proofQuotaUsed / health.proofQuotaTotal) * 100);

  return (
    <Card
      title="Tenant Partition Health"
      subtitle={`Dedicated MongoDB schema isolation for ${tenantName}`}
      action={
        <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>
          Partition Active
        </Badge>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Database Partition Key */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="flex items-center gap-1.5 font-medium text-[11px]">
              <Database className="w-3.5 h-3.5 text-slate-600" />
              Isolated Database Instance
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold">Zero Cross-Talk</span>
          </div>
          <div className="font-mono text-xs font-semibold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200 truncate">
            {health.databaseName}
          </div>
        </div>

        {/* Compute & Proof Latency */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              <span>SNARK Latency</span>
            </div>
            <div className="text-sm font-bold text-slate-900 font-mono">
              {health.latencyMs} <span className="text-[10px] text-slate-400 font-sans">ms avg</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              <span>DB Connection Pool</span>
            </div>
            <div className="text-sm font-bold text-slate-900 font-mono">
              {health.activeConnections} <span className="text-[10px] text-slate-400 font-sans">sockets</span>
            </div>
          </div>
        </div>

        {/* ZK Proof Compute Quota Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1.5">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-indigo-600" />
              Monthly ZK Compute Quota
            </span>
            <span className="font-mono font-medium">
              {health.proofQuotaUsed} / {health.proofQuotaTotal} proofs ({quotaPercent}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                quotaPercent > 90
                  ? 'bg-rose-500'
                  : quotaPercent > 70
                  ? 'bg-amber-500'
                  : 'bg-indigo-600'
              }`}
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Resets automatically on 1st of next billing cycle.
          </span>
        </div>
      </div>
    </Card>
  );
};
