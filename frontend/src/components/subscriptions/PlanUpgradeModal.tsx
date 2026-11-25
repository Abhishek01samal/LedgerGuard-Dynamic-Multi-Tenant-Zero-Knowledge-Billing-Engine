import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatCurrency } from '../../utils/formatters';
import {
  subscriptionService,
  type SubscriptionPlan,
  type TenantSubscriptionInfo,
} from '../../services/subscription.service';
import type { Tenant } from '../../types';
import {
  ArrowRight,
  Sparkles,
  Zap,
  CreditCard,
  Check,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan: SubscriptionPlan | null;
  currentSubscription: TenantSubscriptionInfo | null;
  currentTenant?: Tenant;
  initialCycle?: 'monthly' | 'annual';
  onPlanChanged: (updated: TenantSubscriptionInfo) => void;
}

export const PlanUpgradeModal: React.FC<PlanUpgradeModalProps> = ({
  isOpen,
  onClose,
  targetPlan,
  currentSubscription,
  currentTenant,
  initialCycle = 'monthly',
  onPlanChanged,
}) => {
  const { showToast } = useToast();
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'annual'>(initialCycle);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!targetPlan || !currentSubscription) return null;

  const isUpgrade = targetPlan.monthlyProofsQuota > currentSubscription.proofsQuota;
  const isCurrent = targetPlan.id === currentSubscription.planId;

  const totalBilled =
    selectedCycle === 'annual' ? targetPlan.priceAnnual * 12 : targetPlan.priceMonthly;
  const annualSavings = (targetPlan.priceMonthly - targetPlan.priceAnnual) * 12;

  const handleConfirmSwitch = async () => {
    if (!currentTenant) return;
    setIsSubmitting(true);
    try {
      const updated = await subscriptionService.upgradeOrDowngradePlan(
        currentTenant.id,
        targetPlan.id,
        selectedCycle
      );
      showToast(
        `Successfully switched to ${targetPlan.displayName}! New billing cycle: ${selectedCycle.toUpperCase()}.`,
        'success'
      );
      onPlanChanged(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update subscription';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isUpgrade ? 'Upgrade' : 'Switch'} Subscription Tier`}
      subtitle={`Configure billing parameters for ${currentTenant?.name || 'Active Tenant'}`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirmSwitch}
            isLoading={isSubmitting}
            leftIcon={<Zap className="w-3.5 h-3.5" />}
          >
            {isCurrent
              ? `Confirm ${selectedCycle === 'annual' ? 'Annual' : 'Monthly'} Cycle`
              : `Confirm Plan Switch (${formatCurrency(totalBilled)})`}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 text-xs text-slate-700">
        {/* Plan Transition Comparison Header */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Current Tier
            </span>
            <div className="font-bold text-slate-800 text-sm mt-0.5">
              {currentSubscription.planName} Tier
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {currentSubscription.proofsQuota.toLocaleString()} proofs / mo
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>

          <div className="text-right">
            <span className="text-[10px] text-indigo-600 uppercase tracking-wider font-semibold block">
              Target Tier
            </span>
            <div className="font-bold text-indigo-950 text-sm mt-0.5">
              {targetPlan.displayName}
            </div>
            <div className="text-[11px] text-indigo-700 font-medium">
              {targetPlan.proofQuotaDisplay}
            </div>
          </div>
        </div>

        {/* Billing Cycle Selector Pill */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-xs">
              Select Billing Frequency
            </span>
            {selectedCycle === 'annual' && (
              <Badge variant="success" size="sm">
                Save 20% Annually (${annualSavings.toLocaleString()} saved)
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedCycle('monthly')}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedCycle === 'monthly'
                  ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-xs">Monthly Billing</span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  ${targetPlan.priceMonthly}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Billed month-to-month. Cancel anytime.</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCycle('annual')}
              className={`p-3 rounded-lg border text-left transition-all relative ${
                selectedCycle === 'annual'
                  ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-900 text-xs">Annual Billing</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-800 font-bold uppercase">
                    20% OFF
                  </span>
                </div>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  ${targetPlan.priceAnnual}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Billed annually at ${targetPlan.priceAnnual * 12}/yr.
              </p>
            </button>
          </div>
        </div>

        {/* Pricing Breakdown & Settlement Schedule */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Immediate Financial Statement
          </span>

          <div className="flex items-center justify-between text-xs pt-1 border-b border-slate-200 pb-2">
            <span className="text-slate-600">{targetPlan.displayName} ({selectedCycle})</span>
            <span className="font-mono font-semibold text-slate-900">{formatCurrency(totalBilled)}</span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-b border-slate-200 pb-2">
            <span className="text-slate-600">Payment Instrument</span>
            <div className="flex items-center gap-1.5 font-medium text-slate-800">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              <span>{currentSubscription.paymentMethod}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 font-semibold">
            <span className="text-slate-900">Total Billed Today</span>
            <span className="text-base text-slate-900 font-bold font-mono">
              {formatCurrency(totalBilled)}
            </span>
          </div>
        </div>

        {/* Upgraded Capabilities Included */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Capabilities Included in {targetPlan.name} Tier
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {targetPlan.features.map((feat, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 bg-white">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-slate-700 leading-tight">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
