import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PlanUpgradeModal } from '../../components/subscriptions/PlanUpgradeModal';
import {
  subscriptionService,
  type SubscriptionPlan,
  type TenantSubscriptionInfo,
} from '../../services/subscription.service';
import type { Tenant } from '../../types';
import {
  CreditCard,
  ShieldCheck,
  Clock,
  Zap,
  Check,
  X,
  Building,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface SubscriptionsPageProps {
  currentTenant?: Tenant;
  onPlanUpdated?: (newPlanName: 'Starter' | 'Professional' | 'Enterprise') => void;
}

export const SubscriptionsPage: React.FC<SubscriptionsPageProps> = ({
  currentTenant,
  onPlanUpdated,
}) => {
  const { showToast } = useToast();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<TenantSubscriptionInfo | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isLoading, setIsLoading] = useState(false);

  // Upgrade Modal State
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<SubscriptionPlan | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isTogglingAutoRenew, setIsTogglingAutoRenew] = useState(false);

  const loadSubscriptionData = async () => {
    setIsLoading(true);
    try {
      const plansData = await subscriptionService.getPlans();
      setPlans(plansData);
      if (currentTenant) {
        const subData = await subscriptionService.getTenantSubscription(currentTenant.id);
        setSubscription(subData);
        setBillingCycle(subData.billingCycle);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionData();
  }, [currentTenant]);

  const handleToggleAutoRenew = async () => {
    if (!currentTenant || !subscription) return;
    setIsTogglingAutoRenew(true);
    try {
      const newState = await subscriptionService.toggleAutoRenew(currentTenant.id);
      setSubscription((prev) => (prev ? { ...prev, autoRenew: newState } : null));
      showToast(
        `Auto-renewal ${newState ? 'enabled' : 'disabled'} for ${currentTenant.name}.`,
        'info'
      );
    } catch {
      showToast('Failed to toggle auto-renewal.', 'error');
    } finally {
      setIsTogglingAutoRenew(false);
    }
  };

  const handleOpenUpgrade = (plan: SubscriptionPlan) => {
    setSelectedPlanForUpgrade(plan);
    setIsUpgradeModalOpen(true);
  };

  // Proof quota calculations
  const quotaPercent = useMemo(() => {
    if (!subscription || subscription.proofsQuota === 0) return 0;
    return Math.min(Math.round((subscription.proofsUsed / subscription.proofsQuota) * 100), 100);
  }, [subscription]);

  return (
    <div className="space-y-6">
      {/* Top Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-700" />
            Subscription Tiers & Proof Quotas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Engine tier specifications and cryptographic computational limits for{' '}
            <span className="font-semibold text-slate-700">{currentTenant?.name || 'Active Tenant'}</span>
            {' '}(Partition: <code className="text-indigo-700 font-mono">{currentTenant?.databaseName || 'ledgerguard_tenant'}</code>)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSubscriptionData}
            isLoading={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Sync Quotas
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => showToast(`Payment instrument: ${subscription?.paymentMethod || 'Corporate Card'} is healthy and active.`, 'info')}
            leftIcon={<CreditCard className="w-3.5 h-3.5" />}
          >
            Payment Instrument
          </Button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Plan Card */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Tier</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {subscription?.planName || currentTenant?.plan || 'Professional'}
              </span>
              <Badge variant="success" size="sm">Active</Badge>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <span>Next renewal: {subscription?.nextBillingDate || '2026-12-15'}</span>
            </div>
          </div>
        </Card>

        {/* ZK Proof Quota Meter */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">ZK Proof Monthly Quota</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {subscription?.proofsUsed.toLocaleString()}
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                / {subscription?.proofsQuota.toLocaleString()} ({quotaPercent}%)
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  quotaPercent > 90
                    ? 'bg-rose-500'
                    : quotaPercent > 70
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Partition Isolation Level */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tenant DB Partitions</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {subscription?.dbPartitionsUsed} / {subscription?.dbPartitionsQuota} DBs
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-sky-700 font-medium">
              <span>Dedicated MongoDB isolation</span>
            </div>
          </div>
        </Card>

        {/* Auto-Renewal Status */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Billing Cycle & Renewal</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold text-slate-900 tracking-tight capitalize">
                {subscription?.billingCycle || 'Monthly'}
              </div>
              <button
                type="button"
                onClick={handleToggleAutoRenew}
                disabled={isTogglingAutoRenew}
                className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 underline"
              >
                {subscription?.autoRenew ? 'Turn Off' : 'Turn On'}
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <span className={subscription?.autoRenew ? 'text-emerald-600 font-medium' : 'text-amber-600'}>
                {subscription?.autoRenew ? '● Auto-renewal enabled' : '○ Manual renewal'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Billing Frequency Switcher Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Choose Your Billing Cadence</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Annual billing includes 2 months complimentary zero-knowledge proof quota verification.
          </p>
        </div>

        {/* Interactive Cycle Pill Toggle */}
        <div className="flex items-center rounded-lg border border-slate-200 p-1 bg-slate-50 text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-3.5 py-1.5 rounded-md font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-medium transition-colors ${
              billingCycle === 'annual'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Annual Billing</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold uppercase">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Subscription Pricing Tier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent =
            (subscription?.planName || currentTenant?.plan || '').toLowerCase() ===
            plan.name.toLowerCase();
          const effectivePrice =
            billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 flex flex-col justify-between transition-all relative ${
                plan.isPopular
                  ? 'border-indigo-600 shadow-md bg-white ring-1 ring-indigo-600'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-0.5 rounded-full shadow-xs">
                  Recommended Tier
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base">{plan.displayName}</h3>
                  {isCurrent && (
                    <Badge variant="success" size="sm">
                      Current Plan
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{plan.description}</p>

                {/* Price Display */}
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                    ${effectivePrice}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ month</span>
                </div>
                {billingCycle === 'annual' && (
                  <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                    Billed annually at ${effectivePrice * 12}/year (Save ${(plan.priceMonthly - plan.priceAnnual) * 12})
                  </div>
                )}

                {/* Key Quota Highlights */}
                <div className="mt-5 p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Proof Quota:</span>
                    <strong className="text-slate-800 font-mono">{plan.proofQuotaDisplay}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">DB Isolation:</span>
                    <strong className="text-slate-800">{plan.dbIsolation}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">SLA Response:</span>
                    <strong className="text-slate-800">{plan.sla}</strong>
                  </div>
                </div>

                {/* Features List */}
                <div className="mt-6 space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-5">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-slate-700 leading-tight">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-4 border-t border-slate-100">
                <Button
                  variant={isCurrent ? 'secondary' : plan.isPopular ? 'primary' : 'outline'}
                  className="w-full text-xs"
                  disabled={isCurrent}
                  onClick={() => handleOpenUpgrade(plan)}
                >
                  {isCurrent ? 'Active Plan' : `Switch to ${plan.name}`}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comprehensive Feature Comparison Matrix */}
      <Card
        title="Comprehensive Tier Capability Matrix"
        subtitle="Side-by-side technical comparison of cryptography circuits, database partition boundaries, and SLA commitments"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="pb-3 w-1/3">Capability & Specification</th>
                <th className="pb-3 text-center">Starter</th>
                <th className="pb-3 text-center bg-indigo-50/50 text-indigo-900 rounded-t-lg">Professional</th>
                <th className="pb-3 text-center">Enterprise Shield</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3 font-medium text-slate-900">Monthly ZK Proofs Quota</td>
                <td className="py-3 text-center font-mono">5,000 / mo</td>
                <td className="py-3 text-center font-mono font-semibold text-indigo-950 bg-indigo-50/30">50,000 / mo</td>
                <td className="py-3 text-center font-mono font-bold text-slate-900">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-slate-900">Isolated MongoDB Databases</td>
                <td className="py-3 text-center">1 Partition</td>
                <td className="py-3 text-center font-semibold text-indigo-950 bg-indigo-50/30">Up to 10 Partitions</td>
                <td className="py-3 text-center font-bold text-slate-900">Unlimited Partitions</td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-slate-900">Cryptographic Pairing Circuit</td>
                <td className="py-3 text-center">Groth16 / BN254</td>
                <td className="py-3 text-center font-semibold text-indigo-950 bg-indigo-50/30">Groth16 + PLONK Multi-Curve</td>
                <td className="py-3 text-center font-bold text-slate-900">Custom Circom + Halo2</td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-slate-900">Cryptographic Audit Retention</td>
                <td className="py-3 text-center">30 Days</td>
                <td className="py-3 text-center font-semibold text-indigo-950 bg-indigo-50/30">1 Year Rolling</td>
                <td className="py-3 text-center font-bold text-slate-900">Indefinite & Immutable</td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-slate-900">Dedicated Auditor Node</td>
                <td className="py-3 text-center text-slate-300"><X className="w-4 h-4 mx-auto" /></td>
                <td className="py-3 text-center bg-indigo-50/30 text-slate-300"><X className="w-4 h-4 mx-auto" /></td>
                <td className="py-3 text-center text-emerald-600 font-bold"><Check className="w-4 h-4 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-slate-900">Automated Tax & Currency Conversion</td>
                <td className="py-3 text-center text-slate-300"><X className="w-4 h-4 mx-auto" /></td>
                <td className="py-3 text-center text-emerald-600 font-semibold bg-indigo-50/30"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-3 text-center text-emerald-600 font-bold"><Check className="w-4 h-4 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-slate-900">SLA Response Guarantee</td>
                <td className="py-3 text-center">24 Hours Standard</td>
                <td className="py-3 text-center font-semibold text-indigo-950 bg-indigo-50/30">4 Hours Priority</td>
                <td className="py-3 text-center font-bold text-slate-900">15 Minutes Mission-Critical</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Plan Upgrade Confirmation Modal */}
      <PlanUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        targetPlan={selectedPlanForUpgrade}
        currentSubscription={subscription}
        currentTenant={currentTenant}
        initialCycle={billingCycle}
        onPlanChanged={(updated) => {
          setSubscription(updated);
          onPlanUpdated?.(updated.planName);
          loadSubscriptionData();
        }}
      />
    </div>
  );
};
