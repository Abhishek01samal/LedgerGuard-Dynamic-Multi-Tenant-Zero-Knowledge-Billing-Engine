import React from 'react';
import { ShieldCheck, Building2, Bell, UserCheck } from 'lucide-react';
import { Badge } from '../common/Badge';

export interface NavbarProps {
  currentTenantName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTenantName = 'Acme Enterprise Technologies',
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Branding & Tenant Context */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight text-base">LedgerGuard</span>
            <span className="text-[10px] text-slate-400 ml-1.5 uppercase font-mono tracking-wider">ZK-Billing</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-200 text-xs text-slate-600">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-slate-700">{currentTenantName}</span>
          <Badge variant="success" size="sm">Active Tenant</Badge>
        </div>
      </div>

      {/* Right: ZK Security Status & User Profile */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium">ZK Privacy Engine Online</span>
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
