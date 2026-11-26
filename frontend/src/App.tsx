import { useState, useEffect } from 'react';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Card } from './components/common/Card';
import { Badge } from './components/common/Badge';
import { Button } from './components/common/Button';
import { Input } from './components/common/Input';
import { Select } from './components/common/Select';
import { useToast } from './context/ToastContext';
import {
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Building,
  ShieldCheck,
  Users,
  Lock,
} from 'lucide-react';
import { formatCurrency } from './utils/formatters';
import { invoiceService } from './services/invoice.service';
import { customerService } from './services/customer.service';
import { tenantService } from './services/tenant.service';
import { transactionService } from './services/transaction.service';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardOverview } from './pages/dashboard/DashboardOverview';
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { TransactionsPage } from './pages/transactions/TransactionsPage';
import { SubscriptionsPage } from './pages/subscriptions/SubscriptionsPage';
import { CreateInvoiceModal } from './components/invoices/CreateInvoiceModal';
import { AddCustomerModal } from './components/customers/AddCustomerModal';
import { CommandPalette } from './components/common/CommandPalette';
import { authService } from './services/auth.service';
import type { SearchResultItem } from './services/search.service';
import type { Invoice, Tenant, Customer, Transaction, AuthSession } from './types';
import type { BreadcrumbItem } from './components/layout/Breadcrumbs';

export function App() {
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<'console' | 'landing' | 'login' | 'register'>('console');
  const [, setSession] = useState<AuthSession | null>(() => authService.getCurrentSession());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | undefined>(undefined);

  // Invoices State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  // Customers State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  // Invoice Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Command Palette & Global Search State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global Keyboard Listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initial Load
  useEffect(() => {
    async function loadInitialData() {
      const tenantList = await tenantService.getTenants();
      const active = await tenantService.getActiveTenant();
      const txs = await transactionService.getTransactions(active.id);

      setTenants(tenantList);
      setCurrentTenant(active);
      setTransactions(txs);
      loadInvoices();
      loadCustomers(active.id);
    }
    loadInitialData();
  }, []);

  const loadInvoices = async () => {
    setIsLoadingInvoices(true);
    const data = await invoiceService.getInvoices();
    setInvoices(data);
    setIsLoadingInvoices(false);
  };

  const loadCustomers = async (tenantId?: string) => {
    setIsLoadingCustomers(true);
    try {
      const data = await customerService.getCustomers(tenantId);
      setCustomers(data);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const loadTransactions = async (tenantId?: string) => {
    setIsLoadingTransactions(true);
    try {
      const data = await transactionService.getTransactions(tenantId);
      setTransactions(data);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  useEffect(() => {
    if (currentTenant) {
      loadCustomers(currentTenant.id);
      loadTransactions(currentTenant.id);
    }
  }, [currentTenant]);

  const handleSearchResultSelect = (item: SearchResultItem) => {
    if (item.actionType === 'trigger_action') {
      if (item.payload === 'create_invoice') {
        setIsCreateModalOpen(true);
      } else if (item.payload === 'add_customer') {
        setIsAddCustomerOpen(true);
      }
    } else if (item.targetTab) {
      setActiveTab(item.targetTab);
    }
  };

  // Breadcrumbs builder
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    switch (activeTab) {
      case 'invoices':
        return [{ label: 'Financial Operations' }, { label: 'Invoices & Billing', isCurrent: true }];
      case 'customers':
        return [{ label: 'Financial Operations' }, { label: 'Customer Directory', isCurrent: true }];
      case 'subscriptions':
        return [{ label: 'Financial Operations' }, { label: 'Subscription Plans', isCurrent: true }];
      case 'transactions':
        return [{ label: 'Platform & Privacy' }, { label: 'ZK Ledger & Transactions', isCurrent: true }];
      case 'tenants':
        return [{ label: 'Platform & Privacy' }, { label: 'Tenant Organizations', isCurrent: true }];
      case 'security':
        return [{ label: 'Platform & Privacy' }, { label: 'ZK Cryptographic Security', isCurrent: true }];
      case 'settings':
        return [{ label: 'Configuration' }, { label: 'Settings', isCurrent: true }];
      case 'dashboard':
      default:
        return [{ label: 'LedgerGuard' }, { label: 'Executive Dashboard', isCurrent: true }];
    }
  };

  if (viewMode === 'landing') {
    return (
      <LandingPage
        onEnterConsole={() => setViewMode('console')}
        onNavigateLogin={() => setViewMode('login')}
        onNavigateRegister={() => setViewMode('register')}
      />
    );
  }

  if (viewMode === 'login') {
    return (
      <LoginPage
        onLoginSuccess={(newSession) => {
          setSession(newSession);
          const t = tenants.find((item) => item.id === newSession.user.tenantId);
          if (t) setCurrentTenant(t);
          setViewMode('console');
        }}
        onNavigateRegister={() => setViewMode('register')}
        onNavigateHome={() => setViewMode('landing')}
      />
    );
  }

  if (viewMode === 'register') {
    return (
      <RegisterPage
        onRegisterSuccess={(newSession) => {
          setSession(newSession);
          setViewMode('console');
        }}
        onNavigateLogin={() => setViewMode('login')}
        onNavigateHome={() => setViewMode('landing')}
      />
    );
  }

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tenants={tenants}
      currentTenant={currentTenant}
      onTenantChange={(t) => {
        tenantService.setActiveTenant(t.id);
        setCurrentTenant(t);
        showToast(`Active organization switched to ${t.name}`, 'info');
      }}
      onViewLandingPage={() => setViewMode('landing')}
      onOpenGlobalSearch={() => setIsCommandPaletteOpen(true)}
      onLogout={() => {
        authService.logout();
        setSession(null);
        setViewMode('login');
        showToast('Successfully signed out of console.', 'info');
      }}
      breadcrumbs={getBreadcrumbs()}
      title={
        activeTab === 'customers'
          ? 'Customer Accounts'
          : activeTab === 'subscriptions'
          ? 'Subscription Tiers & Proof Quotas'
          : activeTab === 'transactions'
          ? 'Immutable Zero-Knowledge Ledger'
          : activeTab === 'tenants'
          ? 'Multi-Tenant Organizations'
          : activeTab === 'security'
          ? 'Zero-Knowledge Security Engine'
          : activeTab === 'settings'
          ? 'Console Configuration'
          : activeTab === 'invoices'
          ? 'Invoices & Billing Statements'
          : 'Executive Dashboard Overview'
      }
      subtitle={
        activeTab === 'customers'
          ? `Manage verified enterprise customer records under ${currentTenant?.name}`
          : activeTab === 'subscriptions'
          ? `View available subscription plans and compute quotas for ${currentTenant?.name}`
          : activeTab === 'transactions'
          ? `Cryptographically sealed audit trail and settlement records`
          : activeTab === 'tenants'
          ? `Dynamically partitioned MongoDB database instances per organization`
          : activeTab === 'security'
          ? `ZK-SNARK proof verification and blinded computational commitments`
          : activeTab === 'settings'
          ? `Environment, currency preferences, and API keys`
          : activeTab === 'invoices'
          ? `Manage, filter, and inspect cryptographic proofs for ${currentTenant?.name || 'Active'}`
          : `Executive financial metrics and real-time ledger health for ${currentTenant?.name || 'Active'}`
      }
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingInvoices || isLoadingTransactions ? 'animate-spin' : ''}`} />}
            onClick={() => {
              loadInvoices();
              if (currentTenant) {
                loadCustomers(currentTenant.id);
                loadTransactions(currentTenant.id);
              }
              showToast('Data synced successfully.', 'info');
            }}
          >
            Sync Status
          </Button>

          {activeTab === 'customers' ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsAddCustomerOpen(true)}
            >
              Add Customer
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create Invoice
            </Button>
          )}
        </div>
      }
    >
      {activeTab === 'dashboard' ? (
        <DashboardOverview
          currentTenant={currentTenant}
          invoices={invoices}
          isLoadingInvoices={isLoadingInvoices}
          onRefreshData={() => {
            loadInvoices();
            if (currentTenant) {
              loadCustomers(currentTenant.id);
              loadTransactions(currentTenant.id);
            }
            showToast('Data synced successfully.', 'info');
          }}
          onCreateInvoice={() => setIsCreateModalOpen(true)}
          onAddCustomer={() => setIsAddCustomerOpen(true)}
          onNavigateTab={setActiveTab}
        />
      ) : activeTab === 'invoices' ? (
        <InvoicesPage
          currentTenant={currentTenant}
          invoices={invoices}
          isLoading={isLoadingInvoices}
          onRefresh={loadInvoices}
          onCreateInvoice={() => setIsCreateModalOpen(true)}
        />
      ) : activeTab === 'customers' ? (
        <CustomersPage
          currentTenant={currentTenant}
          customers={customers}
          isLoading={isLoadingCustomers}
          onRefresh={() => {
            if (currentTenant) loadCustomers(currentTenant.id);
          }}
          onIssueInvoice={() => setIsCreateModalOpen(true)}
        />
      ) : activeTab === 'transactions' ? (
        <TransactionsPage
          currentTenant={currentTenant}
          transactions={transactions}
          isLoading={isLoadingTransactions}
          onRefresh={() => {
            if (currentTenant) loadTransactions(currentTenant.id);
          }}
        />
      ) : activeTab === 'subscriptions' ? (
        <SubscriptionsPage
          currentTenant={currentTenant}
          onPlanUpdated={(newPlan) => {
            if (currentTenant) {
              setCurrentTenant({ ...currentTenant, plan: newPlan });
              tenantService.updateTenant(currentTenant.id, { plan: newPlan }).catch(() => {});
            }
          }}
        />
      ) : (
        <>
          {/* 4 Financial Metric Cards (Contextual overview for secondary modules) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Gross Processed Volume</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {formatCurrency(142850)}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+12.4% vs last billing cycle</span>
                </div>
              </div>
            </Card>

            <Card className="hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Invoices</span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900 tracking-tight">{invoices.length}</div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className="text-emerald-600 font-medium">
                    {invoices.filter((i) => i.status === 'paid').length} paid
                  </span>
                  <span>•</span>
                  <span className="text-amber-600 font-medium">
                    {invoices.filter((i) => i.status === 'pending').length} pending
                  </span>
                </div>
              </div>
            </Card>

            <Card className="hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Active Customers</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900 tracking-tight">{customers.length} Accounts</div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-indigo-700 font-medium">
                  <span>Tenant isolated directory</span>
                </div>
              </div>
            </Card>

            <Card className="hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Tenant Isolation Level</span>
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono text-xs truncate">
                  {currentTenant?.databaseName || 'Dynamic DB'}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                  <span>Partitioned MongoDB Schema</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Routed Content Based on Active Tab */}
          {activeTab === 'tenants' ? (
        /* Multi-Tenant Organizations View */
        <Card
          title="Multi-Tenant Partitioned Architecture"
          subtitle="Isolated database storage and dedicated encryption configurations per tenant"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tenants.map((t) => (
              <div
                key={t.id}
                className={`p-4 rounded-xl border transition-all ${
                  t.id === currentTenant?.id
                    ? 'border-slate-900 bg-slate-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{t.name}</h3>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">{t.databaseName}</p>
                  </div>
                  <Badge variant={t.status === 'active' ? 'success' : 'neutral'} size="sm">
                    {t.status}
                  </Badge>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Tier: <strong className="text-slate-700">{t.plan}</strong></span>
                  <Button
                    variant={t.id === currentTenant?.id ? 'secondary' : 'outline'}
                    size="sm"
                    disabled={t.id === currentTenant?.id}
                    onClick={() => {
                      tenantService.setActiveTenant(t.id);
                      setCurrentTenant(t);
                      showToast(`Switched active tenant to ${t.name}`, 'info');
                    }}
                  >
                    {t.id === currentTenant?.id ? 'Current' : 'Switch'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : activeTab === 'security' ? (
        /* Security & ZK Architecture View */
        <div className="space-y-6">
          <Card
            title="Zero-Knowledge Privacy Architecture"
            subtitle="Verified client-side proof validation & isolated cryptographic commitments"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>Blinded Financial Invoicing</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  LedgerGuard produces zk-SNARK commitments for every transaction. External regulators and auditors verify total revenue without inspecting individual line items or proprietary partner rates.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Cross-Tenant Isolation Verifier</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cryptographic boundaries ensure that tenant encryption keys remain segregated in memory and at rest across dynamically provisioned MongoDB databases.
                </p>
              </div>
            </div>
          </Card>
        </div>
      ) : activeTab === 'settings' ? (
        /* Settings View */
        <Card
          title="Console & Organization Preferences"
          subtitle="Manage tenant configuration parameters and default billing settings"
        >
          <div className="max-w-xl space-y-4 text-xs">
            <Input label="Organization Legal Name" defaultValue={currentTenant?.name} />
            <Input label="Assigned Dynamic Database" defaultValue={currentTenant?.databaseName} disabled />
            <Select
              label="Primary Settlement Currency"
              options={[
                { value: 'USD', label: 'USD ($) - US Dollar' },
                { value: 'EUR', label: 'EUR (€) - Euro' },
                { value: 'GBP', label: 'GBP (£) - British Pound' },
              ]}
            />
            <div className="pt-2">
              <Button variant="primary" size="sm" onClick={() => showToast('Preferences updated.', 'success')}>
                Save Preferences
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
      </>
      )}

      {/* 28-Day Development Progress Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card
            title="28-Day Development Milestone Log"
            subtitle="Live progress tracked on GitHub branch 'shraddha'"
            action={<Badge variant="success">Day 14 Complete</Badge>}
          >
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Day 1: Repository Setup & Frontend Foundations (Nov 12, 2026)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Branch <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">shraddha</code> established. Vite + React 19 + TypeScript + Tailwind CSS and architecture docs.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Day 2: Financial Form Primitives & Modal System (Nov 13, 2026)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Built Input, Select, Modal, EmptyState, mock services, and interactive invoice creation with client-side validation.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Day 3: Reusable Table Pagination, Column Sorting & Toast System (Nov 14, 2026)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Delivered Pagination, column sort handlers, Tooltip component, Toast notification context, and dedicated Customer Directory module.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Day 4: Navigation, Modular Sidebar, Breadcrumbs & Application Layout (Nov 15, 2026)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Created DashboardLayout, responsive mobile drawer with hamburger toggle, collapsible desktop sidebar, Breadcrumbs navigation, and subscription/transaction modules.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Day 5: Product Landing Page & Zero-Knowledge Architecture Showcase (Nov 17, 2026)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Engineered high-converting public landing page, interactive pricing calculator with annual discounts, architecture comparison matrix, and technical security FAQ.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Day 6: Authentication & Organization Onboarding Interfaces (Nov 18, 2026)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Engineered tenant-aware login page, organization onboarding registration, zero-knowledge password recovery modal, and auth service session handling.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Day 7: Dashboard Page Layout & Modular Widget Grid Architecture (Nov 19, 2026)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Engineered executive dashboard overview, dynamic financial KPI cards, responsive SVG revenue chart widget, real-time cryptographic activity stream, tenant partition health monitor, and console quick action shortcuts.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Day 8: Dashboard Statistics, Financial Summary & Period Filter (Nov 20, 2026)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Engineered interactive date range selector with YoY comparison, gross vs net revenue toggle, status breakdown distribution, receivables aging buckets, payment rails distribution, ZK circuit metrics, and printable executive audit statement modal.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Day 9: Dedicated Invoice Management Page & Batch Operations (Nov 21, 2026)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Engineered standalone InvoicesPage with status & currency filters, batch actions bar (mark paid, export, delete), multi-column sorting, KPI summary strip, and itemized invoice statement modal with cryptographic proof inspection.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Day 10: Multi-Line Invoice Creation Engine & Validation (Nov 22, 2026)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Engineered dynamic multi-line item builder with real-time quantity × price calculation, automated payment terms due date derivation, tenant customer auto-fill, sales tax and discount controls, inline field validation, and Groth16/BN254 commitment preview.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Day 11: Enterprise Customer Management Page & Client Directory (Nov 23, 2026)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Engineered standalone CustomersPage with KPI metrics strip, real-time search & status filtering, CSV export, slide-over CustomerDetailDrawer with billing history, AddCustomerModal dialog, and account status toggles.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Day 12: Immutable Zero-Knowledge Ledger & Settlement Inspector (Nov 24, 2026)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Engineered standalone TransactionsPage with settlement rail filtering, live ZK-SNARK verification runner (Groth16/BN254), TransactionDetailModal receipt generator with copyable proof commitments, and CSV ledger export.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Day 13: Subscription Tiers, Proof Quota Metering & Plan Upgrade Flow (Nov 25, 2026)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Engineered standalone SubscriptionsPage with annual discount toggle (save 20%), live ZK proof quota metering progress bar, side-by-side tier capability matrix, and PlanUpgradeModal with proration calculations.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Day 14: Universal Command Palette, Cross-Module Search & Date Filtering (Nov 26, 2026)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Engineered global CommandPalette modal (Ctrl+K / Cmd+K) with cross-module search indexing (invoices, customers, ledger proofs, actions), keyboard arrow navigation, DateRangeFilter presets, and Navbar quick-search trigger.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <Card
            title="Backend Architecture Sync"
            subtitle="Status of contracts in FRONTEND_BACKEND_INTEGRATION.md"
          >
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium text-slate-800">Tenant Module</span>
                </div>
                <Badge variant="success" size="sm">Backend Model</Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-slate-800">REST API Server</span>
                </div>
                <Badge variant="warning" size="sm">Pending Backend</Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span className="font-medium text-slate-800">Frontend Modular Layout</span>
                </div>
                <Badge variant="zk" size="sm">Active</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Multi-Line Cryptographic Invoice Creation Engine */}
      <CreateInvoiceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentTenant={currentTenant}
        onInvoiceCreated={() => {
          loadInvoices();
        }}
      />

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        currentTenant={currentTenant}
        onCustomerCreated={() => {
          if (currentTenant) loadCustomers(currentTenant.id);
        }}
      />

      {/* Universal Command Palette & Quick Search (Ctrl+K / Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        currentTenant={currentTenant}
        onSelectResult={handleSearchResultSelect}
      />
    </DashboardLayout>
  );
}

export default App;
