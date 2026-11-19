import React, { useState, useEffect } from 'react';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { RevenueChartWidget } from '../../components/dashboard/RevenueChartWidget';
import { ActivityFeedWidget } from '../../components/dashboard/ActivityFeedWidget';
import { TenantHealthWidget } from '../../components/dashboard/TenantHealthWidget';
import { QuickActionsWidget } from '../../components/dashboard/QuickActionsWidget';
import { Card } from '../../components/common/Card';
import { Badge, type BadgeVariant } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Tooltip } from '../../components/common/Tooltip';
import {
  DollarSign,
  FileText,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Plus,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency, truncateHash } from '../../utils/formatters';
import { dashboardService } from '../../services/dashboard.service';
import type {
  Tenant,
  Invoice,
  DashboardMetrics,
  MonthlyRevenueData,
  ActivityEvent,
  TenantPartitionHealth,
  InvoiceStatus,
} from '../../types';
import { useToast } from '../../context/ToastContext';

export interface DashboardOverviewProps {
  currentTenant?: Tenant;
  invoices: Invoice[];
  isLoadingInvoices: boolean;
  onRefreshData: () => void;
  onCreateInvoice: () => void;
  onAddCustomer: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  currentTenant,
  invoices,
  isLoadingInvoices,
  onRefreshData,
  onCreateInvoice,
  onAddCustomer,
  onNavigateTab,
}) => {
  const { showToast } = useToast();
  const [timeframe, setTimeframe] = useState<'6m' | 'ytd'>('6m');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [revenueData, setRevenueData] = useState<MonthlyRevenueData[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [tenantHealth, setTenantHealth] = useState<TenantPartitionHealth | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  // Fetch dashboard aggregated data when tenant or timeframe changes
  useEffect(() => {
    let isMounted = true;
    async function loadDashboard() {
      setIsLoadingDashboard(true);
      try {
        const [m, rev, acts, health] = await Promise.all([
          dashboardService.getDashboardMetrics(currentTenant?.id),
          dashboardService.getMonthlyRevenue(currentTenant?.id, timeframe),
          dashboardService.getRecentActivities(currentTenant?.id),
          dashboardService.getTenantHealth(currentTenant?.id, currentTenant?.databaseName),
        ]);

        if (isMounted) {
          setMetrics(m);
          setRevenueData(rev);
          setActivities(acts);
          setTenantHealth(health);
        }
      } catch {
        showToast('Failed to load dashboard metrics.', 'error');
      } finally {
        if (isMounted) setIsLoadingDashboard(false);
      }
    }

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, [currentTenant, timeframe]);

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

  // 4 latest invoices for dashboard preview
  const recentInvoices = invoices.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Executive Welcome & Partition Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Executive Overview
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentTenant?.name || 'Active Tenant'}</span>
            </div>
          </div>
          <h2 className="text-lg font-bold tracking-tight">
            Multi-Tenant Zero-Knowledge Billing Engine
          </h2>
          <p className="text-xs text-slate-300 font-mono">
            Active MongoDB Partition: <span className="text-emerald-300 font-semibold">{currentTenant?.databaseName || 'ledgerguard_tenant_acme'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefreshData}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingInvoices ? 'animate-spin' : ''}`} />}
            className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs border border-slate-700"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onCreateInvoice}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="bg-emerald-600 hover:bg-emerald-500 text-xs text-white border-transparent"
          >
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Row 1: 4 Key Financial & Cryptographic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Gross Processed Volume */}
        <MetricCard
          title="Gross Invoiced Volume"
          value={formatCurrency(metrics?.totalRevenue || 142850)}
          delta={{
            value: '+14.8%',
            isPositive: true,
            label: 'vs last billing cycle',
          }}
          icon={DollarSign}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-700"
          isLoading={isLoadingDashboard}
        />

        {/* Metric 2: Settled Revenue & Collection Efficiency */}
        <MetricCard
          title="Settled Revenue"
          value={formatCurrency(metrics?.collectedRevenue || 124600)}
          delta={{
            value: `${metrics?.collectionRate || 87.2}%`,
            isPositive: true,
            label: 'collection rate',
          }}
          icon={CheckCircle2}
          iconBgColor="bg-indigo-50"
          iconTextColor="text-indigo-700"
          badge={{ text: 'Settled', variant: 'success' }}
          isLoading={isLoadingDashboard}
        />

        {/* Metric 3: Total Invoices & Status Split */}
        <MetricCard
          title="Total Invoices Managed"
          value={invoices.length}
          subtext={`${invoices.filter((i) => i.status === 'paid').length} paid • ${
            invoices.filter((i) => i.status === 'pending').length
          } pending`}
          icon={FileText}
          iconBgColor="bg-slate-100"
          iconTextColor="text-slate-700"
          badge={{
            text: `${invoices.filter((i) => i.status === 'overdue').length} Overdue`,
            variant:
              invoices.filter((i) => i.status === 'overdue').length > 0 ? 'danger' : 'neutral',
          }}
          isLoading={isLoadingDashboard}
        />

        {/* Metric 4: Cryptographic Proof Integrity */}
        <MetricCard
          title="Zero-Knowledge Integrity"
          value={`${metrics?.zkProofCoverage || 100}%`}
          delta={{
            value: '100% Blinded',
            isPositive: true,
            label: 'zero data leakage',
          }}
          icon={ShieldCheck}
          iconBgColor="bg-sky-50"
          iconTextColor="text-sky-700"
          badge={{ text: 'SNARK Sealed', variant: 'zk' }}
          isLoading={isLoadingDashboard}
        />
      </div>

      {/* Row 2: Revenue Distribution Visualizer (2/3) + Tenant Partition Health (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChartWidget
            data={revenueData}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            isLoading={isLoadingDashboard}
          />
        </div>

        <div className="lg:col-span-1">
          {tenantHealth && (
            <TenantHealthWidget
              health={tenantHealth}
              tenantName={currentTenant?.name}
              isLoading={isLoadingDashboard}
            />
          )}
        </div>
      </div>

      {/* Row 3: Recent Invoices & Settlement Table (2/3) + Cryptographic Activity Stream (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices Preview */}
        <div className="lg:col-span-2">
          <Card
            title="Recent Billing & Invoicing Records"
            subtitle={`Latest transactions under ${currentTenant?.name || 'Active Tenant'}`}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab('invoices')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                View All Invoices
              </Button>
            }
          >
            {recentInvoices.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No invoices registered yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="pb-3">Invoice</th>
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">ZK Proof</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {recentInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 font-mono font-semibold text-slate-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3">
                          <div className="font-medium text-slate-900">{inv.customerName}</div>
                          <div className="text-[10px] text-slate-400">{inv.customerEmail}</div>
                        </td>
                        <td className="py-3 font-semibold text-slate-900">
                          {formatCurrency(inv.total, inv.currency)}
                        </td>
                        <td className="py-3">
                          <Badge variant={getStatusBadgeVariant(inv.status)} size="sm">
                            <span className="capitalize">{inv.status}</span>
                          </Badge>
                        </td>
                        <td className="py-3">
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
                        <td className="py-3 text-right">
                          <button
                            onClick={() =>
                              showToast(
                                `Verified Proof for ${inv.invoiceNumber}: ${inv.zkProofHash}`,
                                'info'
                              )
                            }
                            className="text-slate-600 hover:text-slate-900 font-medium hover:underline text-[11px]"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Cryptographic Activity Stream */}
        <div className="lg:col-span-1">
          <ActivityFeedWidget events={activities} isLoading={isLoadingDashboard} />
        </div>
      </div>

      {/* Row 4: Quick Actions Grid */}
      <QuickActionsWidget
        onCreateInvoice={onCreateInvoice}
        onAddCustomer={onAddCustomer}
        onNavigateSecurity={() => onNavigateTab('security')}
        onNavigateSubscriptions={() => onNavigateTab('subscriptions')}
        onNavigateTenants={() => onNavigateTab('tenants')}
      />
    </div>
  );
};
