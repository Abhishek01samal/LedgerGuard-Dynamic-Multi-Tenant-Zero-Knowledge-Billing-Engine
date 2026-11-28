export function TransactionStatus({ status }: { status: 'idle' | 'pending' | 'success' | 'error' }) {
  const copy = {
    idle: 'Ready to bill',
    pending: 'Writing the ledger atomically…',
    success: 'Ledger write committed',
    error: 'Request failed — retry with the same idempotency key if the commit may have succeeded',
  };
  return <p className="text-sm text-slate-400">{copy[status]}</p>;
}
