export interface SubscriptionPlan {
  id: string;
  name: string;
  priceMonthly: number;
  description: string;
  features: string[];
  maxTenants: number;
  monthlyProofsQuota: number;
  isPopular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-starter',
    name: 'Starter',
    priceMonthly: 499,
    description: 'Essential billing engine for single-organization SaaS apps.',
    features: [
      '1 Isolated Tenant Database',
      'Up to 5,000 ZK Verification Proofs / mo',
      'Automated Invoicing & Email Dispatch',
      'Community & Standard Support',
    ],
    maxTenants: 1,
    monthlyProofsQuota: 5000,
  },
  {
    id: 'plan-professional',
    name: 'Professional',
    priceMonthly: 1850,
    description: 'High-throughput dynamic multi-tenancy for expanding financial systems.',
    features: [
      'Up to 10 Isolated Tenant Databases',
      '50,000 Cryptographic Proofs / mo',
      'Real-time Cryptographic Audit Trail',
      'Custom Currency & Dynamic Tax Engine',
      'Priority SLA Support (4h response)',
    ],
    maxTenants: 10,
    monthlyProofsQuota: 50000,
    isPopular: true,
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise Shield',
    priceMonthly: 4200,
    description: 'Dedicated zero-knowledge consensus nodes and unlimited organization isolation.',
    features: [
      'Unlimited Isolated Tenant Databases',
      'Unlimited ZK Proof Verifications',
      'Dedicated Zero-Knowledge Auditor Node',
      'Custom Smart Contract / RPC Bridges',
      '24/7 Dedicated Financial Engineer',
    ],
    maxTenants: 999,
    monthlyProofsQuota: 1000000,
  },
];

export const subscriptionService = {
  async getPlans(): Promise<SubscriptionPlan[]> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return [...SUBSCRIPTION_PLANS];
  },
};
