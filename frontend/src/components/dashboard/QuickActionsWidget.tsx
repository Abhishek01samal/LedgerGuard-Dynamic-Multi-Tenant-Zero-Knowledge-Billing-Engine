import React from 'react';
import { Card } from '../common/Card';
import {
  FilePlus,
  UserPlus,
  ShieldCheck,
  Download,
  CreditCard,
  Building,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface QuickActionsWidgetProps {
  onCreateInvoice: () => void;
  onAddCustomer: () => void;
  onNavigateSecurity: () => void;
  onNavigateSubscriptions: () => void;
  onNavigateTenants: () => void;
}

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({
  onCreateInvoice,
  onAddCustomer,
  onNavigateSecurity,
  onNavigateSubscriptions,
  onNavigateTenants,
}) => {
  const { showToast } = useToast();

  const handleExportLedger = () => {
    showToast('Exporting encrypted ledger and zero-knowledge verification proofs (JSON/CSV)...', 'info');
    setTimeout(() => {
      showToast('Zero-knowledge ledger export ready for compliance download.', 'success');
    }, 900);
  };

  const actions = [
    {
      title: 'Create Invoices',
      description: 'Issue blind cryptographic billing statement',
      icon: FilePlus,
      color: 'text-slate-900 group-hover:text-emerald-700',
      bgColor: 'bg-emerald-50 text-emerald-700',
      onClick: onCreateInvoice,
    },
    {
      title: 'Add Customer',
      description: 'Register isolated client into tenant directory',
      icon: UserPlus,
      color: 'text-slate-900 group-hover:text-sky-700',
      bgColor: 'bg-sky-50 text-sky-700',
      onClick: onAddCustomer,
    },
    {
      title: 'ZK Proof Audit',
      description: 'Verify cryptographic validity on SNARK circuit',
      icon: ShieldCheck,
      color: 'text-slate-900 group-hover:text-indigo-700',
      bgColor: 'bg-indigo-50 text-indigo-700',
      onClick: onNavigateSecurity,
    },
    {
      title: 'Export Ledger',
      description: 'Download privacy-preserving settlement audit CSV',
      icon: Download,
      color: 'text-slate-900 group-hover:text-amber-700',
      bgColor: 'bg-amber-50 text-amber-700',
      onClick: handleExportLedger,
    },
    {
      title: 'Proof Quotas',
      description: 'Review subscription tier & compute limits',
      icon: CreditCard,
      color: 'text-slate-900 group-hover:text-purple-700',
      bgColor: 'bg-purple-50 text-purple-700',
      onClick: onNavigateSubscriptions,
    },
    {
      title: 'Tenant Switch',
      description: 'Switch between isolated MongoDB instances',
      icon: Building,
      color: 'text-slate-900 group-hover:text-slate-700',
      bgColor: 'bg-slate-100 text-slate-700',
      onClick: onNavigateTenants,
    },
  ];

  return (
    <Card
      title="Console Quick Actions"
      subtitle="Frequently executed billing operations & cryptographic audits"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.title}
              onClick={act.onClick}
              className="p-3 text-left rounded-lg border border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50 transition-all duration-150 flex flex-col justify-between group h-28"
            >
              <div
                className={`w-7 h-7 rounded-md ${act.bgColor} flex items-center justify-center mb-2`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div
                  className={`text-xs font-semibold text-slate-900 ${act.color} transition-colors`}
                >
                  {act.title}
                </div>
                <div className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                  {act.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};
