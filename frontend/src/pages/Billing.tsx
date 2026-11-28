import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { BillingConfirmation } from '../components/billing/BillingConfirmation';
import { BillingForm } from '../components/billing/BillingForm';
import { TransactionStatus } from '../components/billing/TransactionStatus';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { getErrorMessage } from '../services/api';
import { createTransaction, getReceipt } from '../services/ledger.service';
import type { CreateTransactionInput, TransactionView } from '../types/ledger.types';

function newEventId(): string {
  return `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export function Billing() {
  const queryClient = useQueryClient();
  const [eventId, setEventId] = useState(newEventId);
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    transaction: Pick<TransactionView, 'transactionId' | 'eventId' | 'status' | 'amount' | 'currency'>;
    replayed: boolean;
    signature?: string;
  } | null>(null);

  async function submit(input: CreateTransactionInput) {
    setStatus('pending');
    setError(null);
    try {
      const created = await createTransaction(input);
      let signature: string | undefined;
      try {
        signature = (await getReceipt(created.transaction.transactionId)).signature;
      } catch {
        signature = undefined;
      }
      setResult({ ...created, signature });
      setStatus('success');
      await queryClient.invalidateQueries({ queryKey: ['analytics'] });
      await queryClient.invalidateQueries({ queryKey: ['usage'] });
      await queryClient.invalidateQueries({ queryKey: ['ledger'] });
    } catch (err) {
      setStatus('error');
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="card animate-fade-up p-6">
        <h1 className="text-3xl font-semibold">Billing</h1>
        <p className="mt-2 text-sm text-slate-400">
          Redis coordinates concurrent retries. MongoDB unique indexes and transactions are the source of truth.
        </p>
        <div className="mt-6">
          <BillingForm
            eventId={eventId}
            submitting={status === 'pending'}
            onSubmit={submit}
            onNewKey={() => {
              setEventId(newEventId());
              setResult(null);
              setStatus('idle');
              setError(null);
            }}
          />
        </div>
      </section>
      <aside className="grid gap-4 self-start">
        <TransactionStatus status={status} />
        {error ? <ErrorMessage message={error} /> : null}
        {result ? (
          <BillingConfirmation
            transaction={result.transaction}
            replayed={result.replayed}
            signature={result.signature}
          />
        ) : null}
      </aside>
    </div>
  );
}
