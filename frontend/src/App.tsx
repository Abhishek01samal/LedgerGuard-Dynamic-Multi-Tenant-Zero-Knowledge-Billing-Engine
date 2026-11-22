import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Card } from './components/common/Card';
import { Badge } from './components/common/Badge';
import { Button } from './components/common/Button';
import { Input } from './components/common/Input';
import { Select } from './components/common/Select';
import { Modal } from './components/common/Modal';
import { EmptyState } from './components/common/EmptyState';
import { Pagination } from './components/common/Pagination';
import { useToast } from './context/ToastContext';
import {
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Search,
  Building,
  ShieldCheck,
  Mail,
  User,
  Phone,
  Users,
  Check,
  Lock,
} from 'lucide-react';
import { formatCurrency } from './utils/formatters';
import { invoiceService } from './services/invoice.service';
import { customerService } from './services/customer.service';
import { tenantService } from './services/tenant.service';
import { subscriptionService, type SubscriptionPlan } from './services/subscription.service';
import { transactionService } from './services/transaction.service';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardOverview } from './pages/dashboard/DashboardOverview';
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { CreateInvoiceModal } from './components/invoices/CreateInvoiceModal';
import { authService } from './services/auth.service';
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
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const [customerPageSize, setCustomerPageSize] = useState(5);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
  });
  const [customerFormErrors, setCustomerFormErrors] = useState<Record<string, string>>({});
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);

  // Subscriptions & Transactions State
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Invoice Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Initial Load
  useEffect(() => {
    async function loadInitialData() {
      const tenantList = await tenantService.getTenants();
      const active = await tenantService.getActiveTenant();
      const plans = await subscriptionService.getPlans();
      const txs = await transactionService.getTransactions(active.id);

      setTenants(tenantList);
      setCurrentTenant(active);
      setSubscriptionPlans(plans);
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
    const data = await customerService.getCustomers(tenantId, customerSearch);
    setCustomers(data);
  };

  useEffect(() => {
    if (currentTenant) {
      loadCustomers(currentTenant.id);
      setCustomerPage(1);
    }
  }, [currentTenant, customerSearch]);

  // Paginated Customers
  const paginatedCustomers = useMemo(() => {
    const start = (customerPage - 1) * customerPageSize;
    return customers.slice(start, start + customerPageSize);
  }, [customers, customerPage, customerPageSize]);

  // Handle Customer Form
  const validateCustomerForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!customerFormData.name.trim()) errors.name = 'Contact name is required';
    if (!customerFormData.company.trim()) errors.company = 'Company name is required';
    if (!customerFormData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerFormData.email)) {
      errors.email = 'Enter a valid email address';
    }

    setCustomerFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCustomerForm() || !currentTenant) return;

    setIsSubmittingCustomer(true);
    try {
      const newCust = await customerService.createCustomer(currentTenant.id, customerFormData);
      setIsAddCustomerOpen(false);
      setCustomerFormData({ name: '', company: '', email: '', phone: '' });
      showToast(`Customer "${newCust.company}" added to tenant directory.`, 'success');
      loadCustomers(currentTenant.id);
    } catch {
      showToast('Failed to add customer.', 'error');
    } finally {
      setIsSubmittingCustomer(false);
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
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingInvoices ? 'animate-spin' : ''}`} />}
            onClick={() => {
              loadInvoices();
              if (currentTenant) loadCustomers(currentTenant.id);
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
            if (currentTenant) loadCustomers(currentTenant.id);
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
          {activeTab === 'customers' ? (
        /* Customers View */
        <Card
          title="Customer Accounts"
          subtitle={`Verified clients for ${currentTenant?.name}`}
          action={
            <div className="w-64">
              <Input
                placeholder="Search customers or company..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5" />}
              />
            </div>
          }
        >
          {customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No customers registered"
              description="Register your first enterprise client account to begin issuing tenant-specific invoices."
              action={
                <Button variant="primary" size="sm" onClick={() => setIsAddCustomerOpen(true)}>
                  Add First Customer
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-3">Client Contact</th>
                    <th className="pb-3">Company</th>
                    <th className="pb-3">Contact Email</th>
                    <th className="pb-3">Phone</th>
                    <th className="pb-3">Total Invoiced</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 font-medium text-slate-900">{cust.name}</td>
                      <td className="py-3.5 font-semibold text-slate-800">{cust.company}</td>
                      <td className="py-3.5 text-slate-600">{cust.email}</td>
                      <td className="py-3.5 text-slate-500 font-mono text-[11px]">{cust.phone || '—'}</td>
                      <td className="py-3.5 font-semibold text-slate-900">{formatCurrency(cust.totalBilled)}</td>
                      <td className="py-3.5">
                        <Badge variant={cust.status === 'active' ? 'success' : 'neutral'} size="sm">
                          <span className="capitalize">{cust.status}</span>
                        </Badge>
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => setIsCreateModalOpen(true)}
                          className="text-slate-600 hover:text-slate-900 font-medium hover:underline text-[11px]"
                        >
                          New Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <Pagination
                currentPage={customerPage}
                totalItems={customers.length}
                pageSize={customerPageSize}
                onPageChange={setCustomerPage}
                onPageSizeChange={setCustomerPageSize}
              />
            </div>
          )}
        </Card>
      ) : activeTab === 'subscriptions' ? (
        /* Subscriptions & Tiers View */
        <div className="space-y-6">
          <Card
            title="Tenant Subscription Tiers"
            subtitle="Configured billing engine limits and Zero-Knowledge verification proof quotas"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {subscriptionPlans.map((plan) => {
                const isCurrent = currentTenant?.plan.toLowerCase() === plan.name.toLowerCase().split(' ')[0];
                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl border p-6 flex flex-col justify-between transition-all ${
                      plan.isPopular
                        ? 'border-slate-900 shadow-md bg-white relative'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {plan.isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-semibold uppercase tracking-wider px-3 py-0.5 rounded-full">
                        Recommended
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 text-base">{plan.name}</h3>
                        {isCurrent && <Badge variant="success" size="sm">Active Plan</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-slate-900">${plan.priceMonthly}</span>
                        <span className="text-xs text-slate-500">/ month</span>
                      </div>

                      <div className="mt-6 space-y-2.5 text-xs text-slate-600">
                        {plan.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <Button
                        variant={isCurrent ? 'secondary' : plan.isPopular ? 'primary' : 'outline'}
                        className="w-full text-xs"
                        disabled={isCurrent}
                        onClick={() => showToast(`Selected upgrade to ${plan.name} plan.`, 'success')}
                      >
                        {isCurrent ? 'Current Plan' : 'Select Plan'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      ) : activeTab === 'transactions' ? (
        /* Transactions & ZK Ledger View */
        <Card
          title="Immutable Zero-Knowledge Ledger"
          subtitle="Cryptographically sealed settlement transactions with blind verification proof hashes"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Transaction ID</th>
                  <th className="pb-3">Invoice Ref</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Payment Method</th>
                  <th className="pb-3">Proof Status</th>
                  <th className="pb-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 font-mono font-medium text-slate-900">{tx.id}</td>
                    <td className="py-3.5 font-mono text-slate-600">{tx.invoiceId}</td>
                    <td className="py-3.5 font-medium text-slate-800">{tx.customerName}</td>
                    <td className="py-3.5 font-semibold text-slate-900">{formatCurrency(tx.amount)}</td>
                    <td className="py-3.5 text-slate-600">{tx.paymentMethod}</td>
                    <td className="py-3.5">
                      <Badge variant="zk" size="sm" icon={<ShieldCheck className="w-3 h-3 text-indigo-600" />}>
                        ZK Verified
                      </Badge>
                    </td>
                    <td className="py-3.5 text-slate-500 font-mono text-[11px]">{new Date(tx.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : activeTab === 'tenants' ? (
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
            action={<Badge variant="success">Day 10 Complete</Badge>}
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
      <Modal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        title="Add New Customer"
        subtitle={`Add a new client account to ${currentTenant?.name || 'Active Tenant'}`}
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddCustomerOpen(false)}
              disabled={isSubmittingCustomer}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateCustomer}
              isLoading={isSubmittingCustomer}
            >
              Add Customer
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <Input
            label="Contact Full Name"
            name="name"
            placeholder="e.g. John Doe"
            value={customerFormData.name}
            onChange={(e) => setCustomerFormData((prev) => ({ ...prev, name: e.target.value }))}
            error={customerFormErrors.name}
            required
            leftIcon={<User className="w-3.5 h-3.5" />}
          />
          <Input
            label="Company Name"
            name="company"
            placeholder="e.g. Nova Innovations Corp"
            value={customerFormData.company}
            onChange={(e) => setCustomerFormData((prev) => ({ ...prev, company: e.target.value }))}
            error={customerFormErrors.company}
            required
            leftIcon={<Building className="w-3.5 h-3.5" />}
          />
          <Input
            label="Billing Email"
            name="email"
            type="email"
            placeholder="finance@novainnovations.com"
            value={customerFormData.email}
            onChange={(e) => setCustomerFormData((prev) => ({ ...prev, email: e.target.value }))}
            error={customerFormErrors.email}
            required
            leftIcon={<Mail className="w-3.5 h-3.5" />}
          />
          <Input
            label="Phone Number (Optional)"
            name="phone"
            placeholder="+1 (555) 000-0000"
            value={customerFormData.phone}
            onChange={(e) => setCustomerFormData((prev) => ({ ...prev, phone: e.target.value }))}
            leftIcon={<Phone className="w-3.5 h-3.5" />}
          />
        </form>
      </Modal>
    </DashboardLayout>
  );
}

export default App;
