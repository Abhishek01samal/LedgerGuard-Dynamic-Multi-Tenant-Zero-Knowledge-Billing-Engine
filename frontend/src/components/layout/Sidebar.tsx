import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Users,
  CreditCard,
  History,
  Building,
  ShieldCheck,
  Settings,
  GitBranch,
} from 'lucide-react';

export interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab = 'dashboard',
  onTabChange,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices & Billing', icon: Receipt },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'transactions', label: 'Transactions & ZK', icon: History },
    { id: 'tenants', label: 'Tenant Management', icon: Building },
    { id: 'security', label: 'Zero-Knowledge Security', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 select-none">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Financial Modules
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange?.(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer info: Git Branch & Version */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <GitBranch className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-[11px] text-slate-500">shraddha</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1">
          LedgerGuard Core v0.1.0 • Day 1 Setup
        </div>
      </div>
    </aside>
  );
};
