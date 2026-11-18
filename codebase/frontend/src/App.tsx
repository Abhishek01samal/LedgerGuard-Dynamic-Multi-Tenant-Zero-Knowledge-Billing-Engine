import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Card } from './components/common/Card';
import { Badge, type BadgeVariant } from './components/common/Badge';
import { Button } from './components/common/Button';
import { Input } from './components/common/Input';
import { Select } from './components/common/Select';
import { Modal } from './components/common/Modal';
import { EmptyState } from './components/common/EmptyState';
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
  Check,
  Building,
  ShieldCheck,
  Calendar,
  Mail,
  User,
} from 'lucide-react';
import { formatCurrency, truncateHash } from './utils/formatters';
import { invoiceService } from './services/invoice.service';
import { tenantService } from './services/tenant.service';
import type { Invoice, Tenant, InvoiceStatus } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | undefined>(undefined);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');

  // Modal & Form State for Creating Invoice
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
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
      setTenants(tenantList);
      setCurrentTenant(active);
      loadInvoices();
    }
    loadInitialData();
  }, []);

  // Fetch Invoices based on search & filter
  const loadInvoices = async () => {
    setIsLoadingInvoices(true);
    const data = await invoiceService.getInvoices(statusFilter, searchQuery);
    setInvoices(data);
    setIsLoadingInvoices(false);
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter, searchQuery]);

  // Form Validation & Submission
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.customerName.trim()) {
      errors.customerName = 'Customer name is required';
    }
    if (!formData.customerEmail.trim()) {
      errors.customerEmail = 'Customer email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      errors.customerEmail = 'Enter a valid email address';
    }
    if (!formData.description.trim()) {
      errors.description = 'Billing item description is required';
    }
    const amt = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amt) || amt <= 0) {
      errors.amount = 'Please enter a valid positive billing amount';
    }
    if (!formData.dueDate) {
      errors.dueDate = 'Payment due date is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !currentTenant) return;

    setIsSubmitting(true);
    try {
      const newInv = await invoiceService.createInvoice(currentTenant.id, {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        description: formData.description,
        amount: parseFloat(formData.amount),
        dueDate: formData.dueDate,
      });

      setIsCreateModalOpen(false);
      setFormData({
        customerName: '',
        customerEmail: '',
        description: '',
        amount: '',
        dueDate: '',
      });
      setSuccessMessage(`Invoice ${newInv.invoiceNumber} created and cryptographic ZK proof registered!`);
      loadInvoices();

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch {
      alert('Failed to generate invoice.');
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        tenants={tenants}
        currentTenant={currentTenant}
        onTenantChange={(t) => {
          tenantService.setActiveTenant(t.id);
          setCurrentTenant(t);
        }}
      />

      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto space-y-6">
          {/* Notification Banner */}
          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Header & Quick Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  LedgerGuard Engineering Console
                </h1>
                <Badge variant="zk" size="sm">Day 2: Design Tokens & Forms</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Multi-Tenant Financial Engine • Active Tenant: <span className="font-semibold text-slate-700">{currentTenant?.name}</span> ({currentTenant?.databaseName})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingInvoices ? 'animate-spin' : ''}`} />}
                onClick={loadInvoices}
              >
                Refresh Data
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Create Invoice
              </Button>
            </div>
          </div>

          {/* Financial Stat Cards */}
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
                <div className="text-2xl font-bold text-slate-900 tracking-tight">328</div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className="text-emerald-600 font-medium">294 paid</span>
                  <span>•</span>
                  <span className="text-amber-600 font-medium">26 pending</span>
                </div>
              </div>
            </Card>

            <Card className="hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Zero-Knowledge Proofs</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900 tracking-tight">100% Cryptographic</div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-indigo-700 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Blind verification active</span>
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
                <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono text-sm">
                  {currentTenant?.databaseName || 'Dynamic DB'}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                  <span>Separate MongoDB schema</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Interactive Invoice Management Table with Search & Filters */}
          <Card
            title="Tenant Invoice Ledger"
            subtitle={`Records for ${currentTenant?.name || 'current tenant'} with simulated cryptographic ZK integrity hashes`}
            action={
              <div className="flex items-center gap-2.5">
                {/* Search Bar */}
                <div className="w-56">
                  <Input
                    placeholder="Search by customer or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<Search className="w-3.5 h-3.5" />}
                  />
                </div>

                {/* Status Filter */}
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
                    ? `No invoices match your search query "${searchQuery}". Try clearing your filters.`
                    : 'No invoices have been registered for this filter state.'
                }
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Clear All Filters
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="pb-3">Invoice Number</th>
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">ZK Proof Hash</th>
                      <th className="pb-3">Due Date</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {invoices.map((inv) => (
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
                          <Badge variant="zk" size="sm" icon={<ShieldCheck className="w-3 h-3 text-indigo-600" />}>
                            <span className="font-mono text-[10px]">{truncateHash(inv.zkProofHash)}</span>
                          </Badge>
                        </td>
                        <td className="py-3.5 text-slate-500 font-mono text-[11px]">
                          {inv.dueDate}
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => alert(`Viewing details for ${inv.invoiceNumber} with verified proof.`)}
                            className="text-slate-600 hover:text-slate-900 font-medium hover:underline text-[11px]"
                          >
                            View Audit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* 28-Day Internship Milestone Tracker & Verification */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card
                title="28-Day Development Progress"
                subtitle="Daily milestones tracked on branch 'shraddha'"
                action={<Badge variant="success">Day 2 Complete</Badge>}
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
                        Branch <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">shraddha</code> established and pushed to GitHub. Initialized Vite + React 19 + TypeScript + Tailwind CSS and architecture docs.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                      ✓
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Day 2: Financial Form System & Reusable Dialog Components (Nov 13, 2026)
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Implemented Input, Select, Modal, EmptyState primitives; created dynamic tenant switcher, invoice creation workflow, and search & filtering service.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold">
                      3
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Day 3: Extended Reusable Component Library (Scheduled)
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Complete data table pagination, sorting controls, tooltip helpers, and toast notification context.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Backend Coordination status */}
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
                      <span className="font-medium text-slate-800">Frontend Mock Service</span>
                    </div>
                    <Badge variant="zk" size="sm">Active</Badge>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Invoice Creation Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Tenant Invoice"
        subtitle={`Register a billable invoice for ${currentTenant?.name || 'Active Tenant'}`}
        maxWidth="lg"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateInvoice}
              isLoading={isSubmitting}
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
              value={formData.customerName}
              onChange={handleFormChange}
              error={formErrors.customerName}
              required
              leftIcon={<User className="w-3.5 h-3.5" />}
            />
            <Input
              label="Customer Email"
              name="customerEmail"
              type="email"
              placeholder="billing@acme.com"
              value={formData.customerEmail}
              onChange={handleFormChange}
              error={formErrors.customerEmail}
              required
              leftIcon={<Mail className="w-3.5 h-3.5" />}
            />
          </div>

          <Input
            label="Line Item / Service Description"
            name="description"
            placeholder="e.g. Enterprise Cloud API Access - November"
            value={formData.description}
            onChange={handleFormChange}
            error={formErrors.description}
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
              value={formData.amount}
              onChange={handleFormChange}
              error={formErrors.amount}
              required
              leftIcon={<DollarSign className="w-3.5 h-3.5" />}
            />
            <Input
              label="Payment Due Date"
              name="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={handleFormChange}
              error={formErrors.dueDate}
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
    </div>
  );
}

export default App;
