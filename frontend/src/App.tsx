import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Card } from './components/common/Card';
import { Badge, type BadgeVariant } from './components/common/Badge';
import { Button } from './components/common/Button';
import { Input } from './components/common/Input';
import { Select } from './components/common/Select';
import { Modal } from './components/common/Modal';
import { EmptyState } from './components/common/EmptyState';
import { Pagination } from './components/common/Pagination';
import { Tooltip } from './components/common/Tooltip';
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
  Filter,
  Building,
  ShieldCheck,
  Calendar,
  Mail,
  User,
  Phone,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  Check,
  Lock,
} from 'lucide-react';
import { formatCurrency, truncateHash } from './utils/formatters';
import { invoiceService } from './services/invoice.service';
import { customerService } from './services/customer.service';
import { tenantService } from './services/tenant.service';
import { subscriptionService, type SubscriptionPlan } from './services/subscription.service';
import { transactionService } from './services/transaction.service';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { authService } from './services/auth.service';
import type { Invoice, Tenant, InvoiceStatus, Customer, Transaction, AuthSession } from './types';
import type { BreadcrumbItem } from './components/layout/Breadcrumbs';

type SortField = 'invoiceNumber' | 'customerName' | 'total' | 'dueDate';
type SortOrder = 'asc' | 'desc';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(5);

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
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [invoiceFormErrors, setInvoiceFormErrors] = useState<Record<string, string>>({});
  const [invoiceFormData, setInvoiceFormData] = useState({
    customerName: '',
    customerEmail: '',
    description: '',
    amount: '',
    dueDate: '',
  });

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
    const data = await invoiceService.getInvoices(statusFilter, searchQuery);
    setInvoices(data);
    setIsLoadingInvoices(false);
  };

  const loadCustomers = async (tenantId?: string) => {
    const data = await customerService.getCustomers(tenantId, customerSearch);
    setCustomers(data);
  };

  useEffect(() => {
    loadInvoices();
    setInvoicePage(1);
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    if (currentTenant) {
      loadCustomers(currentTenant.id);
      setCustomerPage(1);
    }
  }, [currentTenant, customerSearch]);

  // Sorting Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sorted and Paginated Invoices
  const sortedInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => {
      let valA: string | number = a[sortField];
      let valB: string | number = b[sortField];

      if (sortField === 'total') {
        valA = a.total;
        valB = b.total;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [invoices, sortField, sortOrder]);

  const paginatedInvoices = useMemo(() => {
    const start = (invoicePage - 1) * invoicePageSize;
    return sortedInvoices.slice(start, start + invoicePageSize);
  }, [sortedInvoices, invoicePage, invoicePageSize]);

  // Paginated Customers
  const paginatedCustomers = useMemo(() => {
    const start = (customerPage - 1) * customerPageSize;
    return customers.slice(start, start + customerPageSize);
  }, [customers, customerPage, customerPageSize]);

  // Handle Invoice Form
  const validateInvoiceForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!invoiceFormData.customerName.trim()) errors.customerName = 'Customer name is required';
    if (!invoiceFormData.customerEmail.trim()) {
      errors.customerEmail = 'Customer email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invoiceFormData.customerEmail)) {
      errors.customerEmail = 'Enter a valid email address';
    }
    if (!invoiceFormData.description.trim()) errors.description = 'Description is required';
    const amt = parseFloat(invoiceFormData.amount);
    if (!invoiceFormData.amount || isNaN(amt) || amt <= 0) {
      errors.amount = 'Please enter a valid positive amount';
    }
    if (!invoiceFormData.dueDate) errors.dueDate = 'Due date is required';

    setInvoiceFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInvoiceForm() || !currentTenant) return;

    setIsSubmittingInvoice(true);
    try {
      const newInv = await invoiceService.createInvoice(currentTenant.id, {
        customerName: invoiceFormData.customerName,
        customerEmail: invoiceFormData.customerEmail,
        description: invoiceFormData.description,
        amount: parseFloat(invoiceFormData.amount),
        dueDate: invoiceFormData.dueDate,
      });

      setIsCreateModalOpen(false);
      setInvoiceFormData({
        customerName: '',
        customerEmail: '',
        description: '',
        amount: '',
        dueDate: '',
      });
      showToast(`Invoice ${newInv.invoiceNumber} created and cryptographic ZK proof registered!`, 'success');
      loadInvoices();
    } catch {
      showToast('Failed to create invoice.', 'error');
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

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

  const getStatusBadgeVariant = (status: InvoiceStatus): BadgeVariant => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'danger';
      case 'draft':
      default:
        return 'neutral';
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-400" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-slate-900" />
    ) : (
      <ArrowDown className="w-3 h-3 text-slate-900" />
    );
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
          : 'LedgerGuard Financial Console'
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
          : `Dynamic Multi-Tenant Billing Engine • Tenant: ${currentTenant?.name || 'Active'}`
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
      {/* 4 Financial Metric Cards (Always visible across dashboard views) */}
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
                          onClick={() => {
                            setInvoiceFormData((prev) => ({
                              ...prev,
                              customerName: cust.company,
                              customerEmail: cust.email,
                            }));
                            setIsCreateModalOpen(true);
                          }}
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
      ) : (
        /* Default Dashboard / Invoices Table View */
        <Card
          title="Tenant Invoice Ledger"
          subtitle={`Live records for ${currentTenant?.name || 'current tenant'} with sortable headers and ZK audit hashes`}
          action={
            <div className="flex items-center gap-2.5">
              <div className="w-56">
                <Input
                  placeholder="Search invoices or customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-3.5 h-3.5" />}
                />
              </div>

              <div className="w-36">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'paid', label: 'Paid' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'overdue', label: 'Overdue' },
                  ]}
                />
              </div>
            </div>
          }
        >
          {invoices.length === 0 ? (
            <EmptyState
              icon={Filter}
              title="No invoices found"
              description={
                searchQuery
                  ? `No invoices match your search query "${searchQuery}".`
                  : 'No invoices match the selected filter.'
              }
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    showToast('Filters cleared.', 'info');
                  }}
                >
                  Clear Filters
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px] select-none">
                    <th
                      className="pb-3 cursor-pointer hover:text-slate-700 transition-colors"
                      onClick={() => handleSort('invoiceNumber')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Invoice Number</span>
                        {renderSortIcon('invoiceNumber')}
                      </div>
                    </th>
                    <th
                      className="pb-3 cursor-pointer hover:text-slate-700 transition-colors"
                      onClick={() => handleSort('customerName')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Customer</span>
                        {renderSortIcon('customerName')}
                      </div>
                    </th>
                    <th
                      className="pb-3 cursor-pointer hover:text-slate-700 transition-colors"
                      onClick={() => handleSort('total')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Amount</span>
                        {renderSortIcon('total')}
                      </div>
                    </th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">ZK Proof Hash</th>
                    <th
                      className="pb-3 cursor-pointer hover:text-slate-700 transition-colors"
                      onClick={() => handleSort('dueDate')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Due Date</span>
                        {renderSortIcon('dueDate')}
                      </div>
                    </th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 font-mono font-semibold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5">
                        <div className="font-medium text-slate-900">{inv.customerName}</div>
                        <div className="text-[11px] text-slate-400">{inv.customerEmail}</div>
                      </td>
                      <td className="py-3.5 font-semibold text-slate-900">
                        {formatCurrency(inv.total, inv.currency)}
                      </td>
                      <td className="py-3.5">
                        <Badge variant={getStatusBadgeVariant(inv.status)} size="sm">
                          <span className="capitalize">{inv.status}</span>
                        </Badge>
                      </td>
                      <td className="py-3.5">
                        <Tooltip content="Deterministic proof verifies financial validity without exposing proprietary business details.">
                          <div className="cursor-help">
                            <Badge variant="zk" size="sm" icon={<ShieldCheck className="w-3 h-3 text-indigo-600" />}>
                              <span className="font-mono text-[10px]">{truncateHash(inv.zkProofHash)}</span>
                            </Badge>
                          </div>
                        </Tooltip>
                      </td>
                      <td className="py-3.5 text-slate-500 font-mono text-[11px]">
                        {inv.dueDate}
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() =>
                            showToast(`Proof Hash for ${inv.invoiceNumber}: ${inv.zkProofHash || 'N/A'}`, 'info')
                          }
                          className="text-slate-600 hover:text-slate-900 font-medium hover:underline text-[11px]"
                        >
                          Verify Proof
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <Pagination
                currentPage={invoicePage}
                totalItems={invoices.length}
                pageSize={invoicePageSize}
                onPageChange={setInvoicePage}
                onPageSizeChange={setInvoicePageSize}
              />
            </div>
          )}
        </Card>
      )}

      {/* 28-Day Development Progress Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card
            title="28-Day Development Milestone Log"
            subtitle="Live progress tracked on GitHub branch 'shraddha'"
            action={<Badge variant="success">Day 6 Complete</Badge>}
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

      {/* Invoice Creation Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Tenant Invoice"
        subtitle={`Register an invoice for ${currentTenant?.name || 'Active Tenant'}`}
        maxWidth="lg"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmittingInvoice}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateInvoice}
              isLoading={isSubmittingInvoice}
            >
              Issue Invoice & Blind Proof
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Customer Name"
              name="customerName"
              placeholder="e.g. Acme Corp"
              value={invoiceFormData.customerName}
              onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, customerName: e.target.value }))}
              error={invoiceFormErrors.customerName}
              required
              leftIcon={<User className="w-3.5 h-3.5" />}
            />
            <Input
              label="Customer Email"
              name="customerEmail"
              type="email"
              placeholder="billing@acme.com"
              value={invoiceFormData.customerEmail}
              onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, customerEmail: e.target.value }))}
              error={invoiceFormErrors.customerEmail}
              required
              leftIcon={<Mail className="w-3.5 h-3.5" />}
            />
          </div>

          <Input
            label="Line Item / Service Description"
            name="description"
            placeholder="e.g. Enterprise Cloud API Access - November"
            value={invoiceFormData.description}
            onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, description: e.target.value }))}
            error={invoiceFormErrors.description}
            required
            leftIcon={<FileText className="w-3.5 h-3.5" />}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Amount ($ USD)"
              name="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={invoiceFormData.amount}
              onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, amount: e.target.value }))}
              error={invoiceFormErrors.amount}
              required
              leftIcon={<DollarSign className="w-3.5 h-3.5" />}
            />
            <Input
              label="Payment Due Date"
              name="dueDate"
              type="date"
              value={invoiceFormData.dueDate}
              onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
              error={invoiceFormErrors.dueDate}
              required
              leftIcon={<Calendar className="w-3.5 h-3.5" />}
            />
          </div>

          <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-200 text-indigo-900 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Zero-Knowledge Privacy Commitment:</span>
              <p className="text-[11px] text-indigo-700 mt-0.5">
                Upon submission, a deterministic cryptographic proof hash will be computed, allowing external auditors to verify financial validity without disclosing line item specifics.
              </p>
            </div>
          </div>
        </form>
      </Modal>

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
