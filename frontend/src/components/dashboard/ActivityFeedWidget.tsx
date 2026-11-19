import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Tooltip } from '../common/Tooltip';
import { truncateHash } from '../../utils/formatters';
import type { ActivityEvent } from '../../types';
import {
  ShieldCheck,
  CheckCircle2,
  FilePlus,
  UserPlus,
  Database,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface ActivityFeedWidgetProps {
  events: ActivityEvent[];
  isLoading?: boolean;
}

export const ActivityFeedWidget: React.FC<ActivityFeedWidgetProps> = ({
  events,
  isLoading = false,
}) => {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'proofs' | 'settlements'>('all');

  const filteredEvents = events.filter((e) => {
    if (filter === 'proofs') return e.type === 'proof_verified';
    if (filter === 'settlements') return e.type === 'payment_settled';
    return true;
  });

  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'proof_verified':
        return <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />;
      case 'payment_settled':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'invoice_created':
        return <FilePlus className="w-3.5 h-3.5 text-slate-600" />;
      case 'customer_added':
        return <UserPlus className="w-3.5 h-3.5 text-sky-600" />;
      case 'tenant_sync':
        return <Database className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  const getIconContainerBg = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'proof_verified':
        return 'bg-indigo-50 border-indigo-200';
      case 'payment_settled':
        return 'bg-emerald-50 border-emerald-200';
      case 'invoice_created':
        return 'bg-slate-100 border-slate-200';
      case 'customer_added':
        return 'bg-sky-50 border-sky-200';
      case 'tenant_sync':
        return 'bg-amber-50 border-amber-200';
    }
  };

  if (isLoading) {
    return (
      <Card title="Cryptographic Activity Stream" className="animate-pulse">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/2 bg-slate-200 rounded" />
                <div className="h-3 w-3/4 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Cryptographic Activity Stream"
      subtitle="Real-time multi-tenant ledger events & zero-knowledge proofs"
      action={
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded ${
              filter === 'all'
                ? 'bg-white font-semibold text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('proofs')}
            className={`px-2 py-0.5 rounded ${
              filter === 'proofs'
                ? 'bg-white font-semibold text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Proofs
          </button>
          <button
            onClick={() => setFilter('settlements')}
            className={`px-2 py-0.5 rounded ${
              filter === 'settlements'
                ? 'bg-white font-semibold text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Settled
          </button>
        </div>
      }
    >
      <div className="divide-y divide-slate-100 -my-2">
        {filteredEvents.map((event) => (
          <div key={event.id} className="py-3 flex items-start gap-3 group">
            {/* Event Icon */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border mt-0.5 ${getIconContainerBg(
                event.type
              )}`}
            >
              {getEventIcon(event.type)}
            </div>

            {/* Event Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900 truncate">
                  {event.title}
                </span>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {event.timestamp}
                </span>
              </div>

              <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                {event.description}
              </p>

              {/* Hash / Proof verification trigger */}
              {event.hash && (
                <div className="mt-2 flex items-center gap-2">
                  <Tooltip content="Click to copy cryptographic commitment hash">
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(event.hash!);
                        showToast(`Proof commitment copied: ${truncateHash(event.hash)}`, 'info');
                      }}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-colors text-[10px] font-mono text-indigo-700"
                    >
                      <ShieldCheck className="w-2.5 h-2.5" />
                      <span>{truncateHash(event.hash)}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                    </button>
                  </Tooltip>
                  <Badge variant="zk" size="sm">
                    ZK Verified
                  </Badge>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredEvents.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-400">
            No activities recorded matching this filter.
          </div>
        )}
      </div>
    </Card>
  );
};
