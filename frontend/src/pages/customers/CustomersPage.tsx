import React, { useState, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { Tooltip } from '../../components/common/Tooltip';
import { CustomerDetailDrawer } from '../../components/customers/CustomerDetailDrawer';
import { AddCustomerModal } from '../../components/customers/AddCustomerModal';
import { formatCurrency } from '../../utils/formatters';
import { customerService } from '../../services/customer.service';
import type { Customer, Tenant } from '../../types';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Download,
  Building,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  FilePlus2,
  Power,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface CustomersPageProps {
  currentTenant?: Tenant;
  customers: Customer[];
  isLoading?: boolean;
  onRefresh: () => void;
  onIssueInvoice?: (customer?: Customer) => void;
}

type SortField = 'company' | 'name' | 'totalBilled' | 'status';
type SortOrder = 'asc' | 'desc';

export const CustomersPage: React.FC<CustomersPageProps> = ({
  currentTenant,
  customers,
  isLoading = false,
  onRefresh,
  onIssueInvoice,
}) => {
  const { showToast } = useToast();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<SortField>('company');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Modals / Drawers state
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

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

  // Filtered & Sorted Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const matchesStatus = statusFilter === 'all' || cust.status === statusFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        cust.company.toLowerCase().includes(query) ||
        cust.name.toLowerCase().includes(query) ||
        cust.email.toLowerCase().includes(query) ||
        (cust.phone && cust.phone.toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [customers, statusFilter, searchQuery]);

  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'company') {
        comparison = a.company.localeCompare(b.company);
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'totalBilled') {
        comparison = a.totalBilled - b.totalBilled;
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredCustomers, sortField, sortOrder]);

  // Paginated slice
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCustomers.slice(start, start + pageSize);
  }, [sortedCustomers, currentPage, pageSize]);

  // Reset page when filter/search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Summary Metrics
  const activeCount = useMemo(() => customers.filter((c) => c.status === 'active').length, [customers]);
  const inactiveCount = useMemo(() => customers.filter((c) => c.status === 'inactive').length, [customers]);
  const totalBilledVolume = useMemo(
    () => customers.reduce((acc, c) => acc + (c.totalBilled || 0), 0),
    [customers]
  );

  // Quick Status Toggle Handler
  const handleToggleStatus = async (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = customer.status === 'active' ? 'inactive' : 'active';
    try {
      await customerService.updateCustomerStatus(customer.id, newStatus);
      showToast(
        `Customer "${customer.company}" marked as ${newStatus.toUpperCase()}.`,
        'success'
      );
      onRefresh();
    } catch {
      showToast('Failed to update customer status.', 'error');
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (customers.length === 0) {
      showToast('No customer records available to export.', 'warning');
      return;
    }

    const headers = ['ID', 'Company', 'Contact Name', 'Email', 'Phone', 'Address', 'Total Billed (USD)', 'Status'];
    const rows = sortedCustomers.map((c) => [
      c.id,
      `"${c.company.replace(/"/g, '""')}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      c.email,
      c.phone || '',
      `"${(c.address || '').replace(/"/g, '""')}"`,
      c.totalBilled.toFixed(2),
      c.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `ledgerguard_customers_${currentTenant?.id || 'tenant'}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${sortedCustomers.length} customer records to CSV.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-700" />
            Customer Directory & Accounts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise client directory isolated under{' '}
            <span className="font-semibold text-slate-700">{currentTenant?.name || 'Active Tenant'}</span>
            {' '}(Partition: <code className="text-indigo-700 font-mono">{currentTenant?.databaseName || 'ledgerguard_tenant'}</code>)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            isLoading={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddCustomerOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Customer
          </Button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Clients</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{customers.length}</div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-indigo-700 font-medium">
              <span>Tenant partitioned directory</span>
            </div>
          </div>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{activeCount}</div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-medium">
              <span>Ready for automated billing</span>
            </div>
          </div>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Inactive Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{inactiveCount}</div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-600 font-medium">
              <span>Billing temporarily suspended</span>
            </div>
          </div>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Lifetime Volume</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(totalBilledVolume)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-medium">
              <span>Cumulative invoiced volume</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Table Card with Search & Filters */}
      <Card
        title="Directory Management"
        subtitle={`Showing ${sortedCustomers.length} of ${customers.length} client accounts`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Pills */}
            <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'active'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'inactive'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Inactive ({inactiveCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="w-64">
              <Input
                placeholder="Search company, contact, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5" />}
              />
            </div>
          </div>
        }
      >
        {sortedCustomers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={customers.length === 0 ? 'No customers registered yet' : 'No clients match your filter'}
            description={
              customers.length === 0
                ? 'Register your first enterprise client account to begin issuing Zero-Knowledge billing statements.'
                : 'Try adjusting your search query or switching the status filter tab.'
            }
            action={
              customers.length === 0 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddCustomerOpen(true)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add First Customer
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th
                    className="pb-3 cursor-pointer select-none hover:text-slate-900 transition-colors"
                    onClick={() => handleSort('company')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Enterprise Client</span>
                      {renderSortIcon('company')}
                    </div>
                  </th>
                  <th
                    className="pb-3 cursor-pointer select-none hover:text-slate-900 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Primary Contact</span>
                      {renderSortIcon('name')}
                    </div>
                  </th>
                  <th className="pb-3">Jurisdiction / Location</th>
                  <th
                    className="pb-3 cursor-pointer select-none hover:text-slate-900 transition-colors text-right"
                    onClick={() => handleSort('totalBilled')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Total Invoiced</span>
                      {renderSortIcon('totalBilled')}
                    </div>
                  </th>
                  <th
                    className="pb-3 cursor-pointer select-none hover:text-slate-900 transition-colors text-center"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Status</span>
                      {renderSortIcon('status')}
                    </div>
                  </th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedCustomers.map((cust) => (
                  <tr
                    key={cust.id}
                    onClick={() => {
                      setSelectedCustomer(cust);
                      setIsDetailDrawerOpen(true);
                    }}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Enterprise Client / Company */}
                    <td className="py-3.5 pr-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                          <Building className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {cust.company}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            ID: {cust.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Primary Contact */}
                    <td className="py-3.5 pr-3">
                      <div className="font-medium text-slate-900">{cust.name}</div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[160px]">{cust.email}</span>
                      </div>
                    </td>

                    {/* Jurisdiction / Address */}
                    <td className="py-3.5 pr-3">
                      <div className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[160px]">{cust.address || 'San Francisco, CA'}</span>
                      </div>
                      {cust.phone && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono mt-0.5">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>{cust.phone}</span>
                        </div>
                      )}
                    </td>

                    {/* Total Invoiced */}
                    <td className="py-3.5 pr-3 text-right">
                      <div className="font-semibold text-slate-900">
                        {formatCurrency(cust.totalBilled)}
                      </div>
                      <div className="text-[10px] text-slate-400">Lifetime volume</div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-3 text-center">
                      <Badge
                        variant={cust.status === 'active' ? 'success' : 'neutral'}
                        size="sm"
                      >
                        <span className="capitalize">{cust.status}</span>
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pl-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Tooltip content="View customer profile & invoices" position="top">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setIsDetailDrawerOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            aria-label="View profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>

                        <Tooltip content="Issue new invoice to this client" position="top">
                          <button
                            type="button"
                            onClick={() => onIssueInvoice?.(cust)}
                            className="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md transition-colors"
                            aria-label="Issue invoice"
                          >
                            <FilePlus2 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>

                        <Tooltip
                          content={cust.status === 'active' ? 'Deactivate account' : 'Reactivate account'}
                          position="top"
                        >
                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(cust, e)}
                            className={`p-1.5 rounded-md transition-colors ${
                              cust.status === 'active'
                                ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                                : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                            }`}
                            aria-label="Toggle status"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalItems={sortedCustomers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </Card>

      {/* Slide-over Profile Drawer */}
      <CustomerDetailDrawer
        customer={selectedCustomer}
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setSelectedCustomer(null);
        }}
        onIssueInvoice={(cust) => {
          setIsDetailDrawerOpen(false);
          onIssueInvoice?.(cust);
        }}
        onStatusChanged={onRefresh}
      />

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        currentTenant={currentTenant}
        onCustomerCreated={() => {
          onRefresh();
        }}
      />
    </div>
  );
};
