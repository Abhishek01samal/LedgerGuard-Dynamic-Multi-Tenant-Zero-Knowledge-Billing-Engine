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
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab = 'dashboard',
  onTabChange,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const coreNavItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices & Billing', icon: Receipt, badge: '26' },
    { id: 'customers', label: 'Customer Directory', icon: Users },
    { id: 'subscriptions', label: 'Subscriptions & Tiers', icon: CreditCard },
    { id: 'transactions', label: 'Transactions & ZK Ledger', icon: History },
  ];

  const adminNavItems = [
    { id: 'tenants', label: 'Tenant Management', icon: Building },
    { id: 'security', label: 'ZK Security & Privacy', icon: ShieldCheck, badge: 'Active' },
    { id: 'settings', label: 'Console Settings', icon: Settings },
  ];

  const handleItemClick = (id: string) => {
    onTabChange?.(id);
    if (isMobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full bg-white select-none">
      <div className="p-3 space-y-4">
        {/* Mobile Header with Close Button */}
        <div className="lg:hidden flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-800">Navigation Menu</span>
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Financial Operations */}
        <div>
          {!isCollapsed && (
            <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Financial Operations
            </div>
          )}
          <nav className="space-y-1">
            {coreNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>
                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-slate-800 text-slate-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section 2: Platform Controls */}
        <div>
          {!isCollapsed && (
            <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Platform & Privacy
            </div>
          )}
          <nav className="space-y-1">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>
                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        isActive
                          ? 'bg-indigo-900 text-indigo-200'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Info & Desktop Collapse Toggle */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex w-full items-center justify-center gap-2 py-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded text-xs transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="text-[11px]">Collapse View</span>
              </>
            )}
          </button>
        )}

        {!isCollapsed && (
          <div className="pt-1">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <GitBranch className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-[11px] text-slate-500">shraddha</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              LedgerGuard UI v0.4.0 • Day 4 Layout
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block ${
          isCollapsed ? 'w-16' : 'w-64'
        } bg-white border-r border-slate-200 h-[calc(100vh-4rem)] sticky top-16 transition-all duration-200 z-20`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[80vw] h-full bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
