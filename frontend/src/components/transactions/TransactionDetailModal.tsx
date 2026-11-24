import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Tooltip } from '../common/Tooltip';
import { formatCurrency, truncateHash } from '../../utils/formatters';
import { transactionService, type ZkProofVerificationResult } from '../../services/transaction.service';
import type { Transaction } from '../../types';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  Printer,
  CreditCard,
  Building,
  Coins,
  ArrowRightLeft,
  FileText,
  Hash,
  Cpu,
  Layers,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  isOpen,
  onClose,
}) => {
  const { showToast } = useToast();
  const [copiedHash, setCopiedHash] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<ZkProofVerificationResult | null>(null);

  if (!transaction) return null;

  const handleCopyHash = () => {
    if (transaction.proofHash) {
      navigator.clipboard.writeText(transaction.proofHash);
      setCopiedHash(true);
      showToast('ZK Proof commitment hash copied to clipboard', 'info');
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleVerifyProof = async () => {
    if (!transaction.proofHash) return;
    setIsVerifying(true);
    try {
      const result = await transactionService.verifyTransactionProof(transaction.id);
      setVerificationResult(result);
      showToast(
        `Cryptographic proof valid! Verified by ${result.circuitName} in ${result.latencyMs}ms.`,
        'success'
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Proof verification failed';
      showToast(message, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getRailIcon = (rail?: string) => {
    switch (rail) {
      case 'wire':
        return <Building className="w-4 h-4 text-slate-700" />;
      case 'ach':
        return <ArrowRightLeft className="w-4 h-4 text-indigo-600" />;
      case 'card':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case 'crypto':
        return <Coins className="w-4 h-4 text-amber-600" />;
      case 'sepa':
      default:
        return <Building className="w-4 h-4 text-sky-600" />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settlement Receipt & Proof Audit"
      subtitle={`Transaction ${transaction.id} • Partition: ${transaction.tenantId}`}
      maxWidth="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print Receipt
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            {transaction.proofHash && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleVerifyProof}
                isLoading={isVerifying}
                leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
              >
                Re-Verify Proof
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5 text-xs text-slate-700">
        {/* Top Summary Banner */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Settlement Amount
            </span>
            <div className="text-2xl font-bold text-slate-900 font-sans tracking-tight">
              {formatCurrency(transaction.amount, transaction.currency)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Net Settled: {formatCurrency(transaction.amount - (transaction.fee || 0), transaction.currency)}
              {transaction.fee ? ` (Fee: ${formatCurrency(transaction.fee, transaction.currency)})` : ''}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {transaction.status === 'succeeded' ? (
              <Badge variant="success" size="md" icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}>
                Settlement Cleared
              </Badge>
            ) : transaction.status === 'pending' ? (
              <Badge variant="warning" size="md" icon={<Clock className="w-3.5 h-3.5 text-amber-600" />}>
                Clearing In Progress
              </Badge>
            ) : (
              <Badge variant="danger" size="md" icon={<AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}>
                Settlement Failed
              </Badge>
            )}

            <span className="text-[11px] text-slate-400 font-mono">
              {new Date(transaction.timestamp).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Transaction Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
            <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Linked Invoice
            </span>
            <div className="font-semibold text-slate-900 font-mono text-xs">
              {transaction.invoiceId}
            </div>
            <div className="text-[11px] text-slate-500">
              Customer: <span className="font-medium text-slate-700">{transaction.customerName}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
            <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider flex items-center gap-1.5">
              {getRailIcon(transaction.settlementRail)} Payment Method & Rail
            </span>
            <div className="font-semibold text-slate-900 text-xs">
              {transaction.paymentMethod}
            </div>
            <div className="text-[11px] text-slate-500 uppercase tracking-wider font-mono">
              Rail: {transaction.settlementRail || 'Standard ACH'}
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
            <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" /> Ledger Block Sequence
            </span>
            <div className="font-semibold text-slate-900 font-mono text-xs">
              Block #{transaction.blockNumber || 4892400}
            </div>
            <div className="text-[11px] text-slate-500">
              Immutable state slot verified
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
            <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" /> Tenant Storage Partition
            </span>
            <div className="font-semibold text-slate-900 font-mono text-xs truncate">
              {transaction.tenantId}
            </div>
            <div className="text-[11px] text-slate-500">
              MongoDB isolated collection partition
            </div>
          </div>
        </div>

        {/* Cryptographic Zero-Knowledge Verification Seal */}
        <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-xs block">
                  Zero-Knowledge Proof Commitment
                </span>
                <span className="text-[11px] text-indigo-700 font-medium">
                  Groth16 / BN254 Pairing Circuit Verification
                </span>
              </div>
            </div>

            <Badge variant={transaction.zkVerified ? 'zk' : 'warning'} size="sm">
              {transaction.zkVerified ? '100% Sealed' : 'Unverified'}
            </Badge>
          </div>

          {transaction.proofHash ? (
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-white border border-indigo-100 flex items-center justify-between gap-2">
                <div className="font-mono text-[11px] text-slate-700 truncate select-all">
                  {transaction.proofHash}
                </div>
                <Tooltip content={copiedHash ? 'Copied!' : 'Copy full 256-bit hash'} position="top">
                  <button
                    type="button"
                    onClick={handleCopyHash}
                    className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  >
                    {copiedHash ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </Tooltip>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Circuit: <strong className="font-mono text-slate-800">{transaction.circuitName || 'BillingSettlementCircuit'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Blind Proof: <strong className="font-mono text-slate-800">{truncateHash(transaction.proofHash, 6)}</strong></span>
                </div>
              </div>

              {verificationResult && (
                <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Cryptographically verified on-curve in <strong>{verificationResult.latencyMs}ms</strong></span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-700">
                    Block #{verificationResult.blockNumber}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-white border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">No cryptographic proof generated</span>
                <span>The transaction failed authorization or was aborted before state commitment.</span>
              </div>
            </div>
          )}
        </div>

        {/* Transaction Memo / Notes */}
        {transaction.notes && (
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-0.5">
              Settlement Notes & Audit Log
            </span>
            <p className="text-slate-600 text-[11px] leading-relaxed">{transaction.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
