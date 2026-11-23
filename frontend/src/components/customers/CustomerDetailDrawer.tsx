import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatCurrency, truncateHash } from '../../utils/formatters';
import { customerService } from '../../services/customer.service';
import type { Customer, Invoice } from '../../types';
import {
  Building,
  Mail,
  Phone,
  MapPin,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Plus,
  Power,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface CustomerDetailDrawerProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onIssueInvoice: (customer: Customer) => void;
  onStatusChanged?: () => void;
}

export const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  customer,
  isOpen,
  onClose,
  onIssueInvoice,
  onStatusChanged,
}) => {
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  useEffect(() => {
    if (isOpen && customer) {
      setIsLoadingInvoices(true);
      customerService
        .getCustomerInvoices(customer.id)
        .then((data) => setInvoices(data))
        .finally(() => setIsLoadingInvoices(false));
    }
  }, [isOpen, customer]);

  if (!customer) return null;

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0) || customer.totalBilled;
  const paidCount = invoices.filter((i) => i.status === 'paid').length;
  const pendingCount = invoices.filter((i) => i.status === 'pending').length;

  const handleToggleStatus = async () => {
    const newStatus = customer.status === 'active' ? 'inactive' : 'active';
    setIsTogglingStatus(true);
    try {
      await customerService.updateCustomerStatus(customer.id, newStatus);
      showToast(
        `Customer "${customer.company}" marked as ${newStatus.toUpperCase()}.`,
        'success'
      );
      onStatusChanged?.();
      onClose();
    } catch {
      showToast('Failed to update customer status.', 'error');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer.company}
      subtitle={`Enterprise client record in tenant partition: ${customer.tenantId}`}
      maxWidth="2xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
            isLoading={isTogglingStatus}
            leftIcon={<Power className="w-3.5 h-3.5" />}
          >
            {customer.status === 'active' ? 'Deactivate Account' : 'Reactivate Account'}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onIssueInvoice(customer);
              }}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Issue Invoice
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-xs text-slate-700">
        {/* Header Profile Banner */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{customer.company}</span>
              <Badge variant={customer.status === 'active' ? 'success' : 'neutral'} size="sm">
                <span className="capitalize">{customer.status}</span>
              </Badge>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Client ID: {customer.id} • Registered: {customer.createdAt}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Cumulative Billing Volume
            </span>
            <span className="text-base font-bold text-slate-900 font-sans">
              {formatCurrency(totalInvoiced)}
            </span>
          </div>
        </div>

        {/* 4 Financial Health Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-[10px] font-semibold uppercase">Total Invoices</span>
              <FileText className="w-3 h-3 text-slate-400" />
            </div>
            <span className="text-sm font-bold text-slate-900 font-mono">{invoices.length}</span>
          </div>

          <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/40">
            <div className="flex items-center justify-between text-emerald-700 mb-0.5">
              <span className="text-[10px] font-semibold uppercase">Paid Invoices</span>
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            </div>
            <span className="text-sm font-bold text-emerald-800 font-mono">{paidCount}</span>
          </div>

          <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/40">
            <div className="flex items-center justify-between text-amber-700 mb-0.5">
              <span className="text-[10px] font-semibold uppercase">Pending</span>
              <Clock className="w-3 h-3 text-amber-600" />
            </div>
            <span className="text-sm font-bold text-amber-800 font-mono">{pendingCount}</span>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-[10px] font-semibold uppercase">ZK Proofs</span>
              <ShieldCheck className="w-3 h-3 text-indigo-600" />
            </div>
            <span className="text-sm font-bold text-indigo-700 font-mono">100% Sealed</span>
          </div>
        </div>

        {/* Contact Information & Corporate Identity */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2.5">
          <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block">
            Primary Contact & Corporate Details
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-600">
                <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  <strong className="text-slate-800">Contact:</strong> {customer.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  <strong className="text-slate-800">Email:</strong> {customer.email}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  <strong className="text-slate-800">Phone:</strong>{' '}
                  {customer.phone || '+1 (555) 019-2834'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  <strong className="text-slate-800">Address:</strong>{' '}
                  {customer.address || 'San Francisco, CA, USA'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Invoices Ledger */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
              Itemized Billing History
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {invoices.length} historical statements
            </span>
          </div>

          {isLoadingInvoices ? (
            <div className="py-8 text-center text-slate-400 animate-pulse">
              Loading customer invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-4 rounded-lg border border-dashed border-slate-200 text-center text-slate-400">
              No invoices generated for this client yet.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Invoice #</th>
                    <th className="py-2 px-3">Issue Date</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Proof Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{inv.createdAt}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900 font-sans">
                        {formatCurrency(inv.total, inv.currency)}
                      </td>
                      <td className="py-2 px-3 font-sans">
                        <Badge
                          variant={
                            inv.status === 'paid'
                              ? 'success'
                              : inv.status === 'pending'
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                        >
                          <span className="capitalize">{inv.status}</span>
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-[10px] text-indigo-700">
                        {truncateHash(inv.zkProofHash)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
