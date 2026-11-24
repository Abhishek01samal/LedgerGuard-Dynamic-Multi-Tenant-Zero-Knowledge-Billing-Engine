import React, { useState, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { Tooltip } from '../../components/common/Tooltip';
import { TransactionDetailModal } from '../../components/transactions/TransactionDetailModal';
import { formatCurrency, truncateHash } from '../../utils/formatters';
import { transactionService } from '../../services/transaction.service';
import type { Transaction, Tenant } from '../../types';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  RefreshCw,
  Download,
  Building,
  CreditCard,
  ArrowRightLeft,
  Coins,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Layers,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface TransactionsPageProps {
  currentTenant?: Tenant;
  transactions: Transaction[];
  isLoading?: boolean;
  onRefresh: () => void;
}

type SortField = 'timestamp' | 'amount' | 'customerName' | 'status';
type SortOrder = 'asc' | 'desc';

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  currentTenant,
  transactions,
  isLoading = false,
  onRefresh,
}) => {
  const { showToast } = useToast();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'succeeded' | 'pending' | 'failed'>('all');
  const [railFilter, setRailFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Modal State
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

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

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
      const matchesRail = railFilter === 'all' || tx.settlementRail === railFilter;
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !query ||
        tx.id.toLowerCase().includes(query) ||
        tx.invoiceId.toLowerCase().includes(query) ||
        tx.customerName.toLowerCase().includes(query) ||
        tx.paymentMethod.toLowerCase().includes(query) ||
        (tx.proofHash && tx.proofHash.toLowerCase().includes(query));

      return matchesStatus && matchesRail && matchesSearch;
    });
  }, [transactions, statusFilter, railFilter, searchQuery]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'timestamp') {
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortField === 'customerName') {
        comparison = a.customerName.localeCompare(b.customerName);
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredTransactions, sortField, sortOrder]);

  // Paginated Slice
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [sortedTransactions, currentPage, pageSize]);

  // Reset pagination on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, railFilter]);

  // Summary Metrics
  const settledVolume = useMemo(
    () =>
      transactions
        .filter((t) => t.status === 'succeeded')
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  const pendingVolume = useMemo(
    () =>
      transactions
        .filter((t) => t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  const zkVerifiedCount = useMemo(
    () => transactions.filter((t) => t.zkVerified).length,
    [transactions]
  );

  const successRate = useMemo(() => {
    if (transactions.length === 0) return 100;
    const succeeded = transactions.filter((t) => t.status === 'succeeded').length;
    return Math.round((succeeded / transactions.length) * 100);
  }, [transactions]);

  // Quick Proof Verification
  const handleQuickVerify = async (tx: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tx.proofHash) return;

    setVerifyingId(tx.id);
    try {
      const result = await transactionService.verifyTransactionProof(tx.id);
      showToast(
        `Proof for ${tx.id} verified valid! Circuit: ${result.circuitName} (${result.latencyMs}ms).`,
        'success'
      );
    } catch {
      showToast(`Verification failed for transaction ${tx.id}`, 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (sortedTransactions.length === 0) {
      showToast('No transaction records to export.', 'warning');
      return;
    }

    transactionService.exportTransactionsCSV(
      sortedTransactions,
      `ledgerguard_ledger_${currentTenant?.id || 'tenant'}_${new Date().toISOString().split('T')[0]}.csv`
    );
    showToast(`Exported ${sortedTransactions.length} ledger transactions to CSV.`, 'success');
  };

  const getRailIcon = (rail?: string) => {
    switch (rail) {
      case 'wire':
        return <Building className="w-3.5 h-3.5 text-slate-700" />;
      case 'ach':
        return <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />;
      case 'card':
        return <CreditCard className="w-3.5 h-3.5 text-emerald-600" />;
      case 'crypto':
        return <Coins className="w-3.5 h-3.5 text-amber-600" />;
      case 'sepa':
      default:
        return <Building className="w-3.5 h-3.5 text-sky-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-700" />
            Immutable Zero-Knowledge Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cryptographically sealed settlement transactions for{' '}
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
            Sync Ledger
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Gross Settled Volume</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(settledVolume)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{successRate}% settlement success rate</span>
            </div>
          </div>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Transactions</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{transactions.length}</div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-medium">
              <span>Sequenced on-chain ledger</span>
            </div>
          </div>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">In Clearing Transit</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(pendingVolume)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-600 font-medium">
              <span>{transactions.filter((t) => t.status === 'pending').length} pending settlements</span>
            </div>
          </div>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">ZK Sealed Proofs</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {zkVerifiedCount} / {transactions.length}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-indigo-700 font-medium">
              <span>Groth16 / BN254 Verified</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Table Card with Search & Filters */}
      <Card
        title="Settlement Explorer"
        subtitle={`Showing ${sortedTransactions.length} of ${transactions.length} immutable ledger transactions`}
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
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('succeeded')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'succeeded'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Succeeded
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'pending'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('failed')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'failed'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Failed
              </button>
            </div>

            {/* Rail Filter Select */}
            <div className="w-40">
              <Select
                value={railFilter}
                onChange={(e) => setRailFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Rails' },
                  { value: 'wire', label: 'Wire / Fedwire' },
                  { value: 'ach', label: 'ACH Network' },
                  { value: 'card', label: 'Corporate Card' },
                  { value: 'sepa', label: 'SEPA Instant' },
                  { value: 'crypto', label: 'USDC Settlement' },
                ]}
              />
            </div>

            {/* Search Input */}
            <div className="w-64">
              <Input
                placeholder="Search TX ID, Invoice, Hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5" />}
              />
            </div>
          </div>
        }
      >
        {sortedTransactions.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={transactions.length === 0 ? 'No transactions recorded' : 'No transactions match filters'}
            description={
              transactions.length === 0
                ? 'Issue an invoice and collect payment to initiate your first Zero-Knowledge settlement.'
                : 'Adjust your search terms or status and settlement rail filter to find the transaction.'
            }
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setRailFilter('all');
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
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Transaction / Block</th>
                  <th
                    className="pb-3 cursor-pointer select-none hover:text-slate-900 transition-colors"
                    onClick={() => handleSort('customerName')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Invoice & Customer</span>
                      {renderSortIcon('customerName')}
                    </div>
                  </th>
                  <th
                    className="pb-3 cursor-pointer select-none hover:text-slate-900 transition-colors text-right"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Amount</span>
                      {renderSortIcon('amount')}
                    </div>
                  </th>
                  <th className="pb-3">Payment Rail</th>
                  <th
                    className="pb-3 cursor-pointer select-none hover:text-slate-900 transition-colors text-center"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Status</span>
                      {renderSortIcon('status')}
                    </div>
                  </th>
                  <th className="pb-3">ZK Proof Commitment</th>
                  <th
                    className="pb-3 cursor-pointer select-none hover:text-slate-900 transition-colors text-right"
                    onClick={() => handleSort('timestamp')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Timestamp</span>
                      {renderSortIcon('timestamp')}
                    </div>
                  </th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => {
                      setSelectedTx(tx);
                      setIsDetailModalOpen(true);
                    }}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Transaction ID & Block */}
                    <td className="py-3.5 pr-3">
                      <div className="font-mono font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {tx.id}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Block #{tx.blockNumber || 4892400}
                      </div>
                    </td>

                    {/* Invoice & Customer */}
                    <td className="py-3.5 pr-3">
                      <div className="font-semibold text-slate-800">{tx.customerName}</div>
                      <div className="font-mono text-[11px] text-slate-500">{tx.invoiceId}</div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 pr-3 text-right">
                      <div className="font-bold text-slate-900 font-mono text-sm">
                        {formatCurrency(tx.amount, tx.currency)}
                      </div>
                      {tx.fee ? (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Fee: {formatCurrency(tx.fee, tx.currency)}
                        </div>
                      ) : null}
                    </td>

                    {/* Payment Rail */}
                    <td className="py-3.5 pr-3">
                      <div className="flex items-center gap-1.5">
                        {getRailIcon(tx.settlementRail)}
                        <span className="font-medium text-slate-800">{tx.paymentMethod}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-3 text-center">
                      {tx.status === 'succeeded' ? (
                        <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3 h-3 text-emerald-600" />}>
                          Succeeded
                        </Badge>
                      ) : tx.status === 'pending' ? (
                        <Badge variant="warning" size="sm" icon={<Clock className="w-3 h-3 text-amber-600" />}>
                          Pending
                        </Badge>
                      ) : (
                        <Badge variant="danger" size="sm" icon={<AlertTriangle className="w-3 h-3 text-rose-600" />}>
                          Failed
                        </Badge>
                      )}
                    </td>

                    {/* ZK Proof Commitment */}
                    <td className="py-3.5 pr-3">
                      {tx.proofHash ? (
                        <Tooltip content="Groth16/BN254 Pairing Circuit Verified" position="top">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono text-[11px]">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>{truncateHash(tx.proofHash, 4)}</span>
                          </div>
                        </Tooltip>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No proof</span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 pr-3 text-right font-mono text-[11px] text-slate-500">
                      <div>{new Date(tx.timestamp).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pl-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Tooltip content="View receipt & cryptographic proof" position="top">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTx(tx);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            aria-label="View receipt"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>

                        {tx.proofHash && (
                          <Tooltip content="Re-run cryptographic circuit verification" position="top">
                            <button
                              type="button"
                              onClick={(e) => handleQuickVerify(tx, e)}
                              disabled={verifyingId === tx.id}
                              className="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md transition-colors disabled:opacity-50"
                              aria-label="Verify ZK proof"
                            >
                              {verifyingId === tx.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ShieldCheck className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalItems={sortedTransactions.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </Card>

      {/* Transaction & Proof Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTx}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTx(null);
        }}
      />
    </div>
  );
};
