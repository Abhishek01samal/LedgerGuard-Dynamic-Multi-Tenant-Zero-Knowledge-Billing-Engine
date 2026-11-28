import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatMoney } from '../lib/money';
import { getErrorMessage } from '../services/api';
import { listTransactions } from '../services/ledger.service';

export function Ledger() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const query = useQuery({
    queryKey: ['ledger', search, status],
    queryFn: () => listTransactions({ page: 1, limit: 25, search: search || undefined, status: status || undefined }),
  });

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">Ledger</p>
          <h1 className="mt-2 text-3xl font-semibold">Transactions</h1>
        </div>
        <div className="flex gap-2">
          <input
            placeholder="Search event, id, description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="field"
          >
            <option value="">All statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </header>
      {query.isLoading ? <LoadingSpinner /> : null}
      {query.error ? <ErrorMessage message={getErrorMessage(query.error)} /> : null}
      {query.data && query.data.transactions.length === 0 ? (
        <EmptyState title="No transactions" body="Bill a payment to write the first double-entry pair." />
      ) : null}
      {query.data && query.data.transactions.length > 0 ? (
        <div className="card animate-fade-up overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-panel text-slate-400">
              <tr>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {query.data.transactions.map((tx) => (
                <tr key={tx.transactionId} className="border-t border-line">
                  <td className="px-4 py-3 font-mono text-xs">{new Date(tx.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs">{tx.eventId}</td>
                  <td className="px-4 py-3 font-mono">{formatMoney(tx.amount, tx.currency)}</td>
                  <td className="px-4 py-3">{tx.status}</td>
                  <td className="px-4 py-3 text-slate-300">{tx.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
