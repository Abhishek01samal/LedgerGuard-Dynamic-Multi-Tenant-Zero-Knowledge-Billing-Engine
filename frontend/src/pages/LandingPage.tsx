import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Building,
  CheckCircle2,
  ArrowRight,
  Database,
  Layers,
  ChevronDown,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useToast } from '../context/ToastContext';
import { subscriptionService, type SubscriptionPlan } from '../services/subscription.service';

export interface LandingPageProps {
  onEnterConsole: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterConsole }) => {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  React.useEffect(() => {
    subscriptionService.getPlans().then(setPlans);
  }, []);

  const faqs = [
    {
      q: 'How does Zero-Knowledge technology protect financial billing data?',
      a: 'Zero-Knowledge proofs (such as zk-SNARKs) enable LedgerGuard to generate a mathematical proof that an invoice total or payment settlement was computed correctly according to contract terms without revealing sensitive proprietary details like line-item pricing, client names, or confidential discounts to external auditors or third parties.',
    },
    {
      q: 'How does dynamic multi-tenancy maintain database isolation?',
      a: 'Unlike traditional SaaS apps that share a single table and filter by tenant ID, LedgerGuard provisions isolated database partitions for each registered organization. Encryption keys and storage volumes are isolated at the database layer, eliminating cross-tenant query contamination.',
    },
    {
      q: 'What is the frontend service architecture?',
      a: 'The frontend is engineered with an isolated service layer (invoice, customer, tenant, subscription, and transaction services) designed for rapid substitution with live RESTful backend microservices following our team integration specification.',
    },
    {
      q: 'Can LedgerGuard integrate with existing ERP and payment gateways?',
      a: 'Yes. LedgerGuard acts as a zero-knowledge billing engine layer that sits alongside traditional payment processors and accounting systems, providing a cryptographically verifiable audit trail for every billing transaction.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Public Landing Navigation Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight text-base">LedgerGuard</span>
            <span className="text-[10px] text-slate-400 ml-1.5 uppercase font-mono tracking-wider">
              ZK-Billing Engine
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
          <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
          <a href="#architecture" className="hover:text-slate-900 transition-colors">ZK Architecture</a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing & Quotas</a>
          <a href="#faq" className="hover:text-slate-900 transition-colors">Security FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => showToast('Documentation is available in the repository documentation/ folder.', 'info')}
            className="hidden sm:inline-flex"
          >
            Documentation
          </Button>
          <Button
            variant="primary"
            size="sm"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={onEnterConsole}
          >
            Launch Console
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 px-4 max-w-6xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Next-Generation Zero-Knowledge Financial SaaS</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
          Dynamic Multi-Tenant Billing with <span className="underline decoration-slate-300 underline-offset-8">Zero-Knowledge</span> Privacy
        </h1>

        <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          LedgerGuard enables SaaS organizations to execute automated subscription billing and invoice reconciliation while mathematically guaranteeing data isolation and financial confidentiality.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="lg"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={onEnterConsole}
            className="w-full sm:w-auto"
          >
            Open Engineering Console
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              const el = document.getElementById('architecture');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full sm:w-auto"
          >
            View ZK Architecture
          </Button>
        </div>

        {/* Live Interactive Hero Preview Card */}
        <div className="pt-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden text-left">
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="ml-2 text-slate-600 font-medium">ledgerguard-zk-node-01 • Tenant Partition Verification</span>
              </div>
              <Badge variant="zk" size="sm">Proof System: zk-SNARK</Badge>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tenant Schema</span>
                <div className="mt-2 text-sm font-bold text-slate-900 font-mono">ledgerguard_tenant_apex</div>
                <div className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Isolated MongoDB instance</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Gross Settlement</span>
                <div className="mt-2 text-sm font-bold text-slate-900">$142,850.00 USD</div>
                <div className="mt-1 text-xs text-slate-500">328 verified transactions</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cryptographic Hash</span>
                <div className="mt-2 text-xs font-mono text-indigo-700 truncate">0x7f9a2c4e1b8d6f3a9e0c...</div>
                <div className="mt-1 text-xs text-indigo-600 font-medium">Blind commitment valid</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Comparison: Traditional vs LedgerGuard */}
      <section id="architecture" className="py-16 bg-white border-y border-slate-200 px-4">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge variant="zk" size="sm">Comparative Architecture</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Why Traditional Billing Engines Fail Modern Enterprise Privacy
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Comparing conventional single-database architectures with LedgerGuard's cryptographic zero-knowledge paradigm.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Traditional Billing */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-slate-500" />
                  <h3 className="font-bold text-sm text-slate-900">Conventional Billing SaaS</h3>
                </div>
                <Badge variant="neutral" size="sm">Legacy Model</Badge>
              </div>

              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span><strong>Shared Database:</strong> All tenant data resides in single shared tables, relying on vulnerable SQL application queries for filtering.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span><strong>Exposed Financial Details:</strong> Auditors and payment providers inspect raw line items, custom pricing, and confidential volume discounts.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span><strong>Manual Reconciliation:</strong> Lengthy end-of-month spreadsheet reconciliation required to confirm billed amounts match contract states.</span>
                </li>
              </ul>
            </div>

            {/* LedgerGuard Model */}
            <div className="p-6 rounded-2xl border border-slate-900 bg-white shadow-md space-y-4 relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900">LedgerGuard ZK-Engine</h3>
                </div>
                <Badge variant="success" size="sm">Zero-Knowledge Protected</Badge>
              </div>

              <ul className="space-y-3 text-xs text-slate-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Partitioned Schemas:</strong> Isolated MongoDB database per organization ensures strict cryptographic and operational boundaries.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Blinded Commitments:</strong> Mathematical zk-SNARK proofs confirm transaction validity without revealing customer identity or rates.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Instant Verification:</strong> Auditors verify proof hashes in milliseconds against deterministic cryptographic commitments.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="py-16 px-4 max-w-6xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="info" size="sm">Core Capabilities</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Engineered for High-Scale Multi-Tenant Operations
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            A complete financial toolset built for enterprise reliability, responsive workflows, and zero cryptographic compromises.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Dynamic Multi-Tenancy</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dynamically partition organization records into isolated MongoDB databases with automated context switching.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">ZK-SNARK Verification</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Generate mathematical proofs for billing totals and settlement records, ensuring complete data confidentiality.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Customer Directory</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Track client contacts, company profiles, total billed volumes, and active subscription states in real time.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Instant Invoicing</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Client-validated invoice creation modal with automated proof hashing, custom itemization, and status tracking.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing & Computation Quotas */}
      <section id="pricing" className="py-16 bg-white border-y border-slate-200 px-4">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <Badge variant="zk" size="sm">Pricing & Quotas</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Transparent Plans for Expanding SaaS Platforms
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Each tier provides dedicated tenant isolation databases and cryptographic proof quotas.
            </p>

            {/* Annual vs Monthly Toggle */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <span className={`text-xs font-medium ${!isAnnual ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  isAnnual ? 'bg-slate-900' : 'bg-slate-300'
                }`}
                aria-label="Toggle annual billing"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    isAnnual ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-xs font-medium flex items-center gap-1 ${isAnnual ? 'text-slate-900' : 'text-slate-400'}`}>
                <span>Annual</span>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">Save 20%</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {plans.map((plan) => {
              const price = isAnnual ? Math.round(plan.priceMonthly * 0.8) : plan.priceMonthly;
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                    plan.isPopular
                      ? 'border-slate-900 shadow-xl bg-white relative'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-semibold uppercase tracking-wider px-3 py-0.5 rounded-full">
                      Most Popular
                    </div>
                  )}

                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{plan.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{plan.description}</p>

                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900">${price}</span>
                      <span className="text-xs text-slate-500">/ month</span>
                    </div>

                    <div className="mt-6 space-y-2.5 text-xs text-slate-600">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <Button
                      variant={plan.isPopular ? 'primary' : 'outline'}
                      className="w-full text-xs"
                      onClick={() => {
                        showToast(`Selected ${plan.name} tier (${isAnnual ? 'annual' : 'monthly'}). Launching console...`, 'success');
                        onEnterConsole();
                      }}
                    >
                      Deploy {plan.name}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security & Cryptography FAQ */}
      <section id="faq" className="py-16 px-4 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <Badge variant="neutral" size="sm">Frequently Asked Questions</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Security & Zero-Knowledge Verification
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Answers to common questions regarding our cryptographic billing model.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="border border-slate-200 rounded-xl bg-white overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between text-xs font-semibold text-slate-900 hover:bg-slate-50/80 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-16 bg-slate-900 text-white px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to explore the LedgerGuard Engine?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Experience dynamic multi-tenancy, interactive invoice creation, sortable ledgers, and zero-knowledge cryptographic verification directly in the engineering console.
          </p>
          <Button
            variant="primary"
            size="lg"
            rightIcon={<ArrowRight className="w-4 h-4 text-emerald-400" />}
            onClick={onEnterConsole}
            className="bg-white text-slate-900 hover:bg-slate-100"
          >
            Launch Console Now
          </Button>
        </div>
      </section>

      {/* Public Footer */}
      <footer className="py-8 bg-white border-t border-slate-200 px-4 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            <span className="font-semibold text-slate-800">LedgerGuard</span>
            <span>• Infotact Solutions Internship Project</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Branch: <strong className="text-slate-800 font-mono">shraddha</strong></span>
            <span>Frontend: Shraddha Mahendra Wagh</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
