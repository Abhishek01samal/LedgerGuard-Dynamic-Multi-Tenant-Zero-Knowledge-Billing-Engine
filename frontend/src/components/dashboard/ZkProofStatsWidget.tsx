import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { ShieldCheck, Cpu, CheckCircle2, Lock, Server } from 'lucide-react';
import type { ZkComputationStats } from '../../types';

export interface ZkProofStatsWidgetProps {
  stats: ZkComputationStats;
  isLoading?: boolean;
}

export const ZkProofStatsWidget: React.FC<ZkProofStatsWidgetProps> = ({
  stats,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card title="ZK Circuit & Prover Computation" className="animate-pulse">
        <div className="h-44 bg-slate-100 rounded-lg" />
      </Card>
    );
  }

  return (
    <Card
      title="ZK Circuit & Prover Metrics"
      subtitle="Cryptographic proof generation and zero-knowledge circuit statistics"
      action={
        <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>
          Circuit Operational
        </Badge>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Proofs Generated</span>
          </div>
          <div className="text-base font-bold text-slate-900 font-mono">
            {stats.totalProofsGenerated}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">100% On-Chain</span>
        </div>

        <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
            <span>Avg Circuit Proving</span>
          </div>
          <div className="text-base font-bold text-slate-900 font-mono">
            {stats.provingCircuitTimeMs}{' '}
            <span className="text-[10px] text-slate-400 font-sans">ms</span>
          </div>
          <span className="text-[10px] text-slate-400">Groth16 SNARK</span>
        </div>

        <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verification Rate</span>
          </div>
          <div className="text-base font-bold text-emerald-700 font-mono">
            {stats.verificationSuccessRate}%
          </div>
          <span className="text-[10px] text-slate-400">Zero false rejects</span>
        </div>

        <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            <span>Blinded Commitments</span>
          </div>
          <div className="text-base font-bold text-slate-900 font-mono">
            {stats.blindedCommitmentsCount}
          </div>
          <span className="text-[10px] text-indigo-600 font-medium">Poseidon Hash</span>
        </div>

        <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
            <Server className="w-3.5 h-3.5 text-slate-600" />
            <span>Prover Cluster Nodes</span>
          </div>
          <div className="text-base font-bold text-slate-900 font-mono">
            {stats.activeProverNodes}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">Active & Healthy</span>
        </div>

        <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Security Audits</span>
          </div>
          <div className="text-base font-bold text-slate-900 font-mono">
            {stats.zeroKnowledgeAuditsPassed}%
          </div>
          <span className="text-[10px] text-slate-400">SOC2 Type II Ready</span>
        </div>
      </div>
    </Card>
  );
};
