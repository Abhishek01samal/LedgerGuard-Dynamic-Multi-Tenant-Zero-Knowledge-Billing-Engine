import { useState } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Card } from './components/common/Card';
import { Badge } from './components/common/Badge';
import { Button } from './components/common/Button';
import {
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  ShieldAlert,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Server,
  Layers,
  FileCode2,
} from 'lucide-react';
import { formatCurrency } from './utils/formatters';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar currentTenantName="Apex Financial Cloud (Tenant #1)" />

      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto space-y-6">
          {/* Welcome & Day 1 Milestone Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  LedgerGuard Engineering Console
                </h1>
                <Badge variant="zk" size="sm">ZK Architecture v1</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Multi-Tenant Financial Engine • Frontend Workspace initialized for Shraddha Mahendra Wagh
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
                onClick={handleRefresh}
              >
                Sync Status
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Create Invoice
              </Button>
            </div>
          </div>

          {/* Core Metric Cards */}
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
                <span className="text-xs font-medium text-slate-500">ZK Proof Verification</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900 tracking-tight">99.8%</div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-indigo-700 font-medium">
                  <span>Cryptographic integrity intact</span>
                </div>
              </div>
            </Card>

            <Card className="hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Tenant Isolation Level</span>
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900 tracking-tight">Dynamic DB</div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                  <span>Isolated schema per organization</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Architecture Status & Team Coordination Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Frontend Roadmap & Day 1 Verification */}
            <div className="lg:col-span-2 space-y-6">
              <Card
                title="Frontend Architecture & 28-Day Roadmap"
                subtitle="Track progress across your assigned 20 core contribution days"
                action={<Badge variant="info">Day 1 Complete</Badge>}
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                      ✓
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Day 1: Repository Inspection & Foundation Initialization
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Clean branch <code className="text-slate-800 bg-slate-200 px-1 py-0.5 rounded text-[11px]">shraddha</code> created,
                        Vite + React 19 + TypeScript + Tailwind CSS configured, core design tokens and reusable component primitives established.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-lg bg-white border border-slate-200">
                    <div className="w-7 h-7 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold">
                      2
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Day 2: Design System Refinement & Extended Tokens
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Comprehensive color palette, financial typography scale, custom form inputs, and modal wrappers.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-lg bg-white border border-slate-200">
                    <div className="w-7 h-7 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold">
                      3
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Day 3: Reusable UI Component Library Completion
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Build data tables with pagination, search bar, dropdowns, and accessible modal dialogs.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Sample Activity / Recent Invoices Table (Mock Data with Clear Separation) */}
              <Card
                title="Recent Billing Activity (Mock Data Preview)"
                subtitle="Visual preview of the invoice management table to be finalized in Week 2"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-medium">
                        <th className="pb-2.5">Invoice ID</th>
                        <th className="pb-2.5">Customer</th>
                        <th className="pb-2.5">Amount</th>
                        <th className="pb-2.5">Status</th>
                        <th className="pb-2.5">ZK Proof</th>
                        <th className="pb-2.5">Due Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-3 font-mono font-medium text-slate-900">INV-2026-001</td>
                        <td className="py-3">Vertex Technologies</td>
                        <td className="py-3 font-semibold text-slate-900">{formatCurrency(4200)}</td>
                        <td className="py-3"><Badge variant="success" size="sm">Paid</Badge></td>
                        <td className="py-3"><Badge variant="zk" size="sm">Verified (0x7f9a...)</Badge></td>
                        <td className="py-3 text-slate-500">Nov 20, 2026</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-mono font-medium text-slate-900">INV-2026-002</td>
                        <td className="py-3">Starlight Data Labs</td>
                        <td className="py-3 font-semibold text-slate-900">{formatCurrency(1850)}</td>
                        <td className="py-3"><Badge variant="warning" size="sm">Pending</Badge></td>
                        <td className="py-3"><Badge variant="zk" size="sm">Verified (0x4c2b...)</Badge></td>
                        <td className="py-3 text-slate-500">Nov 28, 2026</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-mono font-medium text-slate-900">INV-2026-003</td>
                        <td className="py-3">Quantum Logistics</td>
                        <td className="py-3 font-semibold text-slate-900">{formatCurrency(7300)}</td>
                        <td className="py-3"><Badge variant="danger" size="sm">Overdue</Badge></td>
                        <td className="py-3"><Badge variant="neutral" size="sm">Pending Audit</Badge></td>
                        <td className="py-3 text-slate-500">Nov 10, 2026</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Right Column: Backend Sync & Team Coordination */}
            <div className="space-y-6">
              <Card
                title="Backend Team Sync"
                subtitle="Live status from team repository inspection"
              >
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium text-slate-800">Database Layer</span>
                    </div>
                    <Badge variant="success" size="sm">Mongoose Ready</Badge>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium text-slate-800">Tenant Module</span>
                    </div>
                    <Badge variant="success" size="sm">Model Built</Badge>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span className="font-medium text-slate-800">HTTP REST Server</span>
                    </div>
                    <Badge variant="warning" size="sm">Pending Backend</Badge>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-800">ZK Proof Service</span>
                    </div>
                    <Badge variant="neutral" size="sm">In Spec</Badge>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
                  <span className="font-semibold text-slate-700">Contract Ready: </span>
                  The frontend uses replaceable TypeScript mock services complying with <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">FRONTEND_BACKEND_INTEGRATION.md</code> until backend APIs are exposed.
                </div>
              </Card>

              <Card
                title="Internship Deliverables"
                subtitle="Documentation maintained in repository"
              >
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <FileCode2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>SHRADDHA_FRONTEND_PLAN.md</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <FileCode2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>SHRADDHA_COMMIT_TRACKER.md</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <FileCode2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>FRONTEND_BACKEND_INTEGRATION.md</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
