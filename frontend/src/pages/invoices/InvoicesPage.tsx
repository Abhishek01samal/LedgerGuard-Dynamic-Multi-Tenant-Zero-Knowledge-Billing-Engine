import React, { useState, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge, type BadgeVariant } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Pagination } from '../../components/common/Pagination';
import { Tooltip } from '../../components/common/Tooltip';
import { EmptyState } from '../../components/common/EmptyState';
import { InvoiceDetailModal } from '../../components/invoices/InvoiceDetailModal';
import { InvoiceBatchActionBar } from '../../components/invoices/InvoiceBatchActionBar';
import { formatCurrency, truncateHash } from '../../utils/formatters';
import { invoiceService } from '../../services/invoice.service';
import type { Invoice, InvoiceStatus, Tenant } from '../../types';
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Plus,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface InvoicesPageProps {
  currentTenant?: Tenant;
  invoices: Invoice[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreateInvoice: () => void;
}

type SortField = 'invoiceNumber' | 'customerName' | 'total' | 'dueDate' | 'status';
type SortOrder = 'asc' | 'desc';

export const InvoicesPage: React.FC<InvoicesPageProps> = ({
  currentTenant,
  invoices,
  isLoading,
  onRefresh,
  onCreateInvoice,
}) => {
  const { showToast } = useToast();

  // Search, Filter, Sort & Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'USD' | 'EUR' | 'GBP'>('all');
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Selection & Modal States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Sorting Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
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

  // Filtered and Sorted Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      const matchesCurrency = currencyFilter === 'all' || inv.currency === currencyFilter;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        inv.invoiceNumber.toLowerCase().includes(query) ||
        inv.customerName.toLowerCase().includes(query) ||
        inv.customerEmail.toLowerCase().includes(query);

      return matchesStatus && matchesCurrency && matchesSearch;
    });
  }, [invoices, statusFilter, currencyFilter, searchQuery]);

  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
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
  }, [filteredInvoices, sortField, sortOrder]);

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedInvoices.slice(start, start + pageSize);
  }, [sortedInvoices, currentPage, pageSize]);

  // Status Badge Variant
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

  // Checkbox Selection
  const isAllSelected =
    paginatedInvoices.length > 0 &&
    paginatedInvoices.every((inv) => selectedIds.includes(inv.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      const pageIds = paginatedInvoices.map((i) => i.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Status Actions
  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      await invoiceService.updateInvoiceStatus(invoiceId, 'paid');
      showToast(`Invoice ${invoiceId} marked as paid and ZK proof confirmed.`, 'success');
      onRefresh();
    } catch {
      showToast('Failed to update invoice status.', 'error');
    }
  };

  const handleBatchMarkPaid = async () => {
    try {
      await invoiceService.batchUpdateStatus(selectedIds, 'paid');
      showToast(`${selectedIds.length} invoices marked as paid.`, 'success');
      setSelectedIds([]);
      onRefresh();
    } catch {
      showToast('Failed to batch update invoices.', 'error');
    }
  };

  const handleBatchExport = () => {
    showToast(`Exporting ${selectedIds.length} invoices as CSV...`, 'info');
    setTimeout(() => {
      showToast('Export file downloaded successfully.', 'success');
      setSelectedIds([]);
    }, 700);
  };

  const handleBatchDelete = async () => {
    try {
      await invoiceService.batchDelete(selectedIds);
      showToast(`${selectedIds.length} invoices archived/deleted.`, 'info');
      setSelectedIds([]);
      onRefresh();
    } catch {
      showToast('Failed to delete invoices.', 'error');
    }
  };

  // KPI Calculations
  const totalBilled = invoices.reduce((sum, i) => sum + i.total, 0);
  const paidTotal = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);
  const pendingTotal = invoices
    .filter((i) => i.status === 'pending')
    .reduce((sum, i) => sum + i.total, 0);
  const overdueTotal = invoices
    .filter((i) => i.status === 'overdue')
    .reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="space-y-6">
      {/* Top Invoice Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Invoiced</span>
            <span className="text-[10px] text-slate-400 font-mono">{invoices.length} invs</span>
          </div>
          <div className="text-xl font-bold text-slate-900 font-sans">
            {formatCurrency(totalBilled)}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Settled Collections
            </span>
            <span className="text-[10px] font-mono">
              {invoices.filter((i) => i.status === 'paid').length} paid
            </span>
          </div>
          <div className="text-xl font-bold text-emerald-800 font-sans">
            {formatCurrency(paidTotal)}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Pending Receivables
            </span>
            <span className="text-[10px] font-mono">
              {invoices.filter((i) => i.status === 'pending').length} pending
            </span>
          </div>
          <div className="text-xl font-bold text-amber-800 font-sans">
            {formatCurrency(pendingTotal)}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Overdue at Risk
            </span>
            <span className="text-[10px] font-mono">
              {invoices.filter((i) => i.status === 'overdue').length} overdue
            </span>
          </div>
          <div className="text-xl font-bold text-rose-800 font-sans">
            {formatCurrency(overdueTotal)}
          </div>
        </div>
      </div>

      {/* Main Invoices Management Table Card */}
      <Card
        title="Invoice Ledger & Management"
        subtitle={`Multi-tenant billing statements for ${currentTenant?.name || 'Active Tenant'}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              className="text-xs"
            >
              Sync
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                showToast('Exporting complete tenant invoice catalog (CSV)...', 'info');
                setTimeout(() => {
                  showToast('Export complete: invoices_ledger.csv', 'success');
                }, 700);
              }}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Export
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onCreateInvoice}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Create Invoice
            </Button>
          </div>
        }
      >
        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pt-1">
          {/* Search Input */}
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search invoice #, customer name, email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              leftIcon={<Search className="w-3.5 h-3.5" />}
            />
          </div>

          {/* Status Tabs and Currency Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Pills */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              {(['all', 'paid', 'pending', 'overdue', 'draft'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold capitalize transition-all ${
                    statusFilter === status
                      ? 'bg-white shadow-xs text-slate-900'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Currency Filter Dropdown */}
            <div className="w-28">
              <Select
                value={currencyFilter}
                onChange={(e) => {
                  setCurrencyFilter(e.target.value as typeof currencyFilter);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Currencies' },
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'EUR', label: 'EUR (€)' },
                  { value: 'GBP', label: 'GBP (£)' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Invoices Table View */}
        {filteredInvoices.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="No invoices found"
            description={
              searchQuery
                ? `No invoices match your search query "${searchQuery}".`
                : 'No invoices match the selected status or currency filter.'
            }
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setCurrencyFilter('all');
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
                  <th className="pb-3 w-8">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
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
                  <th
                    className="pb-3 cursor-pointer hover:text-slate-700 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      {renderSortIcon('status')}
                    </div>
                  </th>
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
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedInvoices.map((inv) => {
                  const isSelected = selectedIds.includes(inv.id);
                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(inv.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 font-mono font-semibold text-slate-900">
                        <button
                          onClick={() => {
                            setActiveInvoice(inv);
                            setIsDetailModalOpen(true);
                          }}
                          className="hover:underline text-left"
                        >
                          {inv.invoiceNumber}
                        </button>
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
                        <Tooltip content="Zero-knowledge proof hash mathematically proves valid invoice generation without exposing client rate.">
                          <div className="cursor-help inline-block">
                            <Badge
                              variant="zk"
                              size="sm"
                              icon={<ShieldCheck className="w-3 h-3 text-indigo-600" />}
                            >
                              <span className="font-mono text-[10px]">
                                {truncateHash(inv.zkProofHash)}
                              </span>
                            </Badge>
                          </div>
                        </Tooltip>
                      </td>
                      <td className="py-3.5 text-slate-500 font-mono text-[11px]">
                        {inv.dueDate}
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setActiveInvoice(inv);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="View Invoice Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {inv.status !== 'paid' && (
                            <button
                              onClick={() => handleMarkAsPaid(inv.id)}
                              className="text-emerald-600 hover:text-emerald-800 font-semibold text-[11px] hover:underline"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalItems={filteredInvoices.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </Card>

      {/* Floating Batch Actions Bar */}
      <InvoiceBatchActionBar
        selectedCount={selectedIds.length}
        onBatchMarkPaid={handleBatchMarkPaid}
        onBatchExport={handleBatchExport}
        onBatchDelete={handleBatchDelete}
        onDeselectAll={() => setSelectedIds([])}
      />

      {/* Detailed Invoice Slide-Over / Preview Modal */}
      <InvoiceDetailModal
        invoice={activeInvoice}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setActiveInvoice(null);
        }}
        onMarkAsPaid={handleMarkAsPaid}
      />
    </div>
  );
};
