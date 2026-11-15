import React, { useState } from 'react';
import { ShieldCheck, Building2, Bell, UserCheck, ChevronDown, Check } from 'lucide-react';
import { Badge } from '../common/Badge';
import type { Tenant } from '../../types';

export interface NavbarProps {
  tenants?: Tenant[];
  currentTenant?: Tenant;
  onTenantChange?: (tenant: Tenant) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  tenants = [],
  currentTenant,
  onTenantChange,
}) => {
  const [isTenantDropdownOpen, setIsTenantDropdownOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Branding & Tenant Context */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight text-base">LedgerGuard</span>
            <span className="text-[10px] text-slate-400 ml-1.5 uppercase font-mono tracking-wider">ZK-Billing</span>
          </div>
        </div>

        {/* Dynamic Multi-Tenant Switcher */}
        <div className="hidden md:relative md:flex items-center pl-4 border-l border-slate-200 text-xs text-slate-600">
          <Building2 className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <button
            onClick={() => setIsTenantDropdownOpen(!isTenantDropdownOpen)}
            className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1 rounded-md transition-colors text-left"
          >
            <div>
              <div className="font-semibold text-slate-800 leading-tight">
                {currentTenant?.name || 'Acme Enterprise'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {currentTenant?.databaseName || 'ledgerguard_db'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {currentTenant && (
            <Badge
              variant={currentTenant.status === 'active' ? 'success' : 'neutral'}
              size="sm"
            >
              {currentTenant.status === 'active' ? 'Active DB' : 'Inactive'}
            </Badge>
          )}

          {/* Tenant Selector Dropdown Menu */}
          {isTenantDropdownOpen && tenants.length > 0 && (
            <div className="absolute top-12 left-4 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Switch Organization / Tenant
              </div>
              {tenants.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onTenantChange?.(t);
                    setIsTenantDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors ${
                    t.id === currentTenant?.id ? 'bg-slate-50 font-semibold text-slate-900' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <div>{t.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{t.databaseName}</div>
                  </div>
                  {t.id === currentTenant?.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: ZK Security Status & User Profile */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium">ZK Engine: Operational</span>
        </div>

        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-xs font-semibold text-slate-700">
            SW
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-medium text-slate-900 flex items-center gap-1">
              Shraddha Wagh
              <UserCheck className="w-3 h-3 text-emerald-600" />
            </div>
            <div className="text-[11px] text-slate-500">Frontend Intern (L1)</div>
          </div>
        </div>
      </div>
    </header>
  );
};
