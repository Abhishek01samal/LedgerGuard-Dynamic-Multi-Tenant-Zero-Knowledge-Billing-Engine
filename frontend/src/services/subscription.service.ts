export interface SubscriptionPlan {
  id: string;
  name: 'Starter' | 'Professional' | 'Enterprise';
  displayName: string;
  priceMonthly: number;
  priceAnnual: number;
  description: string;
  features: string[];
  maxTenants: number;
  monthlyProofsQuota: number;
  proofQuotaDisplay: string;
  sla: string;
  dbIsolation: string;
  circuitSupport: string;
  isPopular?: boolean;
}

export interface TenantSubscriptionInfo {
  tenantId: string;
  planId: string;
  planName: 'Starter' | 'Professional' | 'Enterprise';
  billingCycle: 'monthly' | 'annual';
  nextBillingDate: string;
  proofsUsed: number;
  proofsQuota: number;
  dbPartitionsUsed: number;
  dbPartitionsQuota: number;
  autoRenew: boolean;
  paymentMethod: string;
  amount: number;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-starter',
    name: 'Starter',
    displayName: 'Starter Engine',
    priceMonthly: 499,
    priceAnnual: 399, // 20% savings
    description: 'Essential billing engine for single-organization SaaS apps with basic ZK verification.',
    features: [
      '1 Isolated Tenant Database',
      '5,000 ZK Verification Proofs / mo',
      'Automated Invoicing & Email Dispatch',
      'Groth16/BN254 Basic Pairing Circuit',
      'Community & Standard Support (24h SLA)',
    ],
    maxTenants: 1,
    monthlyProofsQuota: 5000,
    proofQuotaDisplay: '5,000 proofs / mo',
    sla: '24 hours standard',
    dbIsolation: '1 Dedicated MongoDB DB',
    circuitSupport: 'Groth16 / BN254',
  },
  {
    id: 'plan-professional',
    name: 'Professional',
    displayName: 'Professional Multi-Tenant',
    priceMonthly: 1850,
    priceAnnual: 1480, // 20% savings
    description: 'High-throughput dynamic multi-tenancy for expanding financial ecosystems & compliance.',
    features: [
      'Up to 10 Isolated Tenant Databases',
      '50,000 Cryptographic Proofs / mo',
      'Real-time Cryptographic Audit Trail',
      'Custom Currency & Dynamic Tax Engine',
      'Groth16 + PLONK Multi-Circuit Engine',
      'Priority SLA Support (4h response)',
    ],
    maxTenants: 10,
    monthlyProofsQuota: 50000,
    proofQuotaDisplay: '50,000 proofs / mo',
    sla: '4 hours priority',
    dbIsolation: 'Up to 10 MongoDB Partitions',
    circuitSupport: 'Groth16, PLONK, BN254',
    isPopular: true,
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise',
    displayName: 'Enterprise Shield',
    priceMonthly: 4200,
    priceAnnual: 3360, // 20% savings
    description: 'Dedicated zero-knowledge consensus nodes, custom circuits, and unlimited partition isolation.',
    features: [
      'Unlimited Isolated Tenant Databases',
      'Unlimited ZK Proof Verifications',
      'Dedicated Zero-Knowledge Auditor Node',
      'Custom Circom Circuit & Smart Contract Bridges',
      'Sub-second On-chain Verification Gateway',
      '24/7 Dedicated Financial Engineer SLA (15m response)',
    ],
    maxTenants: 999,
    monthlyProofsQuota: 1000000,
    proofQuotaDisplay: 'Unlimited proofs / mo',
    sla: '15 mins mission-critical',
    dbIsolation: 'Unlimited Isolated Partitions',
    circuitSupport: 'Full Custom Circom, Halo2, Groth16',
  },
];

// In-memory tenant subscription records
const tenantSubscriptionsStore: Record<string, TenantSubscriptionInfo> = {
  'tenant-apex-01': {
    tenantId: 'tenant-apex-01',
    planId: 'plan-professional',
    planName: 'Professional',
    billingCycle: 'monthly',
    nextBillingDate: '2026-12-15',
    proofsUsed: 14820,
    proofsQuota: 50000,
    dbPartitionsUsed: 3,
    dbPartitionsQuota: 10,
    autoRenew: true,
    paymentMethod: 'Corporate Card (*4821)',
    amount: 1850,
  },
  'tenant-strata-02': {
    tenantId: 'tenant-strata-02',
    planId: 'plan-starter',
    planName: 'Starter',
    billingCycle: 'annual',
    nextBillingDate: '2027-04-10',
    proofsUsed: 3120,
    proofsQuota: 5000,
    dbPartitionsUsed: 1,
    dbPartitionsQuota: 1,
    autoRenew: true,
    paymentMethod: 'ACH Wire Transfer (*9102)',
    amount: 4788,
  },
  'tenant-quantum-03': {
    tenantId: 'tenant-quantum-03',
    planId: 'plan-enterprise',
    planName: 'Enterprise',
    billingCycle: 'monthly',
    nextBillingDate: '2026-12-01',
    proofsUsed: 89450,
    proofsQuota: 1000000,
    dbPartitionsUsed: 12,
    dbPartitionsQuota: 999,
    autoRenew: true,
    paymentMethod: 'Fedwire Escrow Account',
    amount: 4200,
  },
};

export const subscriptionService = {
  async getPlans(): Promise<SubscriptionPlan[]> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return [...SUBSCRIPTION_PLANS];
  },

  async getTenantSubscription(tenantId: string): Promise<TenantSubscriptionInfo> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    const sub = tenantSubscriptionsStore[tenantId];
    if (sub) return { ...sub };

    // Default subscription if unknown tenant
    return {
      tenantId,
      planId: 'plan-professional',
      planName: 'Professional',
      billingCycle: 'monthly',
      nextBillingDate: '2026-12-31',
      proofsUsed: 8400,
      proofsQuota: 50000,
      dbPartitionsUsed: 1,
      dbPartitionsQuota: 10,
      autoRenew: true,
      paymentMethod: 'Corporate Card (*4821)',
      amount: 1850,
    };
  },

  async upgradeOrDowngradePlan(
    tenantId: string,
    targetPlanId: string,
    cycle: 'monthly' | 'annual'
  ): Promise<TenantSubscriptionInfo> {
    await new Promise((resolve) => setTimeout(resolve, 350)); // simulate billing transaction

    const targetPlan = SUBSCRIPTION_PLANS.find((p) => p.id === targetPlanId);
    if (!targetPlan) {
      throw new Error(`Plan ${targetPlanId} not found.`);
    }

    const currentSub = await this.getTenantSubscription(tenantId);
    const amount = cycle === 'annual' ? targetPlan.priceAnnual * 12 : targetPlan.priceMonthly;

    const updated: TenantSubscriptionInfo = {
      ...currentSub,
      planId: targetPlan.id,
      planName: targetPlan.name,
      billingCycle: cycle,
      amount,
      proofsQuota: targetPlan.monthlyProofsQuota,
      dbPartitionsQuota: targetPlan.maxTenants,
      nextBillingDate:
        cycle === 'annual'
          ? '2027-11-25'
          : '2026-12-25',
    };

    tenantSubscriptionsStore[tenantId] = updated;
    return updated;
  },

  async toggleAutoRenew(tenantId: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const sub = await this.getTenantSubscription(tenantId);
    sub.autoRenew = !sub.autoRenew;
    tenantSubscriptionsStore[tenantId] = sub;
    return sub.autoRenew;
  },
};
