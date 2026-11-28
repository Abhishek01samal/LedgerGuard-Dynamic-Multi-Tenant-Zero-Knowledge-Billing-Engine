import { useState } from 'react';
import type { CreateTransactionInput, Currency } from '../../types/ledger.types';

interface Props {
  eventId: string;
  submitting: boolean;
  onSubmit: (input: CreateTransactionInput) => void;
  onNewKey: () => void;
}

export function BillingForm({ eventId, submitting, onSubmit, onNewKey }: Props) {
  const [description, setDescription] = useState('Monthly subscription');
  const [amount, setAmount] = useState('1000');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [debitAccount, setDebitAccount] = useState('customer_001');
  const [creditAccount, setCreditAccount] = useState('merchant_001');

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          eventId,
          description,
          amount: Number(amount),
          currency,
          debitAccount,
          creditAccount,
        });
      }}
    >
      <label className="grid gap-1 text-xs text-slate-400">
        Idempotency key / eventId
        <div className="flex gap-2">
          <input
            readOnly
            value={eventId}
            className="field w-full font-mono"
          />
          <button type="button" onClick={onNewKey} className="button rounded-lg border border-line px-3 text-xs hover:border-white/60 hover:text-white">
            New key
          </button>
        </div>
      </label>
      <label className="grid gap-1 text-xs text-slate-400">
        Description
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="field"
          required
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-slate-400">
          Amount (major units)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="field"
            required
          />
        </label>
        <label className="grid gap-1 text-xs text-slate-400">
          Currency
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="field"
          >
            <option>INR</option>
            <option>USD</option>
            <option>EUR</option>
            <option>GBP</option>
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-slate-400">
          Debit account
          <input
            value={debitAccount}
            onChange={(e) => setDebitAccount(e.target.value)}
            className="field"
            required
          />
        </label>
        <label className="grid gap-1 text-xs text-slate-400">
          Credit account
          <input
            value={creditAccount}
            onChange={(e) => setCreditAccount(e.target.value)}
            className="field"
            required
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="button rounded-xl bg-white px-4 py-3 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {submitting ? 'Processing…' : 'Submit billing request'}
      </button>
      <p className="text-xs text-slate-500">
        If the network times out after commit, retry with the same key. A new key would create a second charge.
      </p>
    </form>
  );
}
