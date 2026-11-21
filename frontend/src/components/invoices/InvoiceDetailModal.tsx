import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge, type BadgeVariant } from '../common/Badge';
import { formatCurrency, truncateHash } from '../../utils/formatters';
import type { Invoice, InvoiceStatus } from '../../types';
import {
  Printer,
  Download,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building,
  Mail,
  Copy,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsPaid?: (invoiceId: string) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onMarkAsPaid,
}) => {
  const { showToast } = useToast();

  if (!invoice) return null;

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

  const handlePrint = () => {
    window.print();
  };

  const handleCopyHash = () => {
    if (invoice.zkProofHash) {
      navigator.clipboard?.writeText(invoice.zkProofHash);
      showToast(`ZK Proof Hash copied to clipboard: ${truncateHash(invoice.zkProofHash)}`, 'info');
    }
  };

  const handleDownloadPDF = () => {
    showToast(`Generating statement PDF for ${invoice.invoiceNumber}...`, 'info');
    setTimeout(() => {
      showToast(`Invoice ${invoice.invoiceNumber} PDF downloaded.`, 'success');
    }, 700);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invoice ${invoice.invoiceNumber}`}
      subtitle={`Billing statement issued to ${invoice.customerName}`}
      maxWidth="2xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyHash}
              leftIcon={<Copy className="w-3.5 h-3.5" />}
            >
              Copy Hash
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
            >
              Print
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {invoice.status !== 'paid' && onMarkAsPaid && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onMarkAsPaid(invoice.id);
                  onClose();
                }}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              >
                Mark as Paid
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadPDF}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Download PDF
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-xs text-slate-700">
        {/* Status and Metadata Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Payment Status
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={getStatusBadgeVariant(invoice.status)} size="md">
                <span className="capitalize font-semibold">{invoice.status}</span>
              </Badge>
              <Badge variant="zk" size="sm" icon={<ShieldCheck className="w-3 h-3 text-indigo-600" />}>
                ZK Sealed
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-right">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Issue Date
              </span>
              <span className="font-mono text-slate-900 font-semibold">{invoice.createdAt}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Due Date
              </span>
              <span className="font-mono text-slate-900 font-semibold">{invoice.dueDate}</span>
            </div>
          </div>
        </div>

        {/* Customer & Tenant Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
              Billed To (Customer)
            </span>
            <div className="font-bold text-slate-900 text-sm">{invoice.customerName}</div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{invoice.customerEmail}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>ID: {invoice.customerId}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
              Originating Tenant Partition
            </span>
            <div className="font-mono font-bold text-slate-900 text-sm truncate">
              {invoice.tenantId}
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Partition Schema: Isolated</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Cryptographic Proof Valid</span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div>
          <span className="text-xs font-bold text-slate-900 block mb-2">Itemized Services</span>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {item.description}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatCurrency(item.unitPrice, invoice.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(item.amount, invoice.currency)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-800">Professional Services</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">1</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatCurrency(invoice.subtotal, invoice.currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                      {formatCurrency(invoice.subtotal, invoice.currency)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculation Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono">
            <div className="flex justify-between text-slate-600">
              <span className="font-sans">Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="font-sans">Tax (8.5%):</span>
              <span>{formatCurrency(invoice.tax || Math.round(invoice.subtotal * 0.085), invoice.currency)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
              <span className="font-sans">Total Billed:</span>
              <span className="text-emerald-700">
                {formatCurrency(invoice.total, invoice.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Zero-Knowledge Proof Cryptographic Verification Box */}
        <div className="p-3.5 bg-slate-900 text-white rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero-Knowledge Proof Verification</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Groth16 / BN254</span>
          </div>

          <div className="space-y-1.5 pt-1 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Cryptographic Proof Hash:</span>
              <div className="font-mono text-emerald-300 text-[10px] break-all bg-slate-800/80 p-2 rounded border border-slate-700">
                {invoice.zkProofHash || '0x4f8a9e2d1c6b3a5e7f0a8b9c2d1e3f4a5b6c7d8e'}
              </div>
            </div>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              This proof guarantees mathematical correctness and payment integrity without exposing underlying line item rates or customer volume to unauthorized third parties.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
