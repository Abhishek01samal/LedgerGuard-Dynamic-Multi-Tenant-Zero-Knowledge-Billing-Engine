import { formatMoney } from '../../lib/money';
import type { TransactionView } from '../../types/ledger.types';

export function BillingConfirmation({
  transaction,
  replayed,
  signature,
}: {
  transaction: Pick<TransactionView, 'transactionId' | 'eventId' | 'status' | 'amount' | 'currency'>;
  replayed: boolean;
  signature?: string;
}) {
  return (
    <div className="card animate-fade-up border-white/30 bg-white/5 p-5">
      <p className="text-sm font-medium text-accent">
        {replayed ? 'Idempotent replay — original transaction returned' : 'Transaction completed'}
      </p>
      <dl className="mt-4 grid gap-2 font-mono text-sm">
        <div>ID: {transaction.transactionId}</div>
        <div>Event: {transaction.eventId}</div>
        <div>Status: {transaction.status}</div>
        <div>Amount: {formatMoney(transaction.amount, transaction.currency)}</div>
        {signature ? <div className="break-all text-xs text-slate-400">RSA receipt: {signature.slice(0, 48)}…</div> : null}
      </dl>
    </div>
  );
}
