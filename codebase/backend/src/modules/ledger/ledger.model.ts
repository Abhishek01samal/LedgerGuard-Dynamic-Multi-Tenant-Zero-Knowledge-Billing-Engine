import mongoose, { Schema, type Model } from 'mongoose';
import { TRANSACTION_STATUSES } from '../../../../shared/contracts/ledger.contract';
import type { TransactionStatus } from '../../../../shared/contracts/ledger.contract';

export interface LedgerTransaction {
  tenantId: string;
  eventId: string;
  transactionId: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
  description: string;
  debitAccount?: string;
  creditAccount?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type EntrySide = 'DEBIT' | 'CREDIT';

export interface LedgerEntry {
  tenantId: string;
  eventId: string;
  side: EntrySide;
  account: string;
  amount: number;
  currency: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const transactionSchema = new Schema<LedgerTransaction>(
  {
    tenantId: {
      type: String,
      required: true,
      trim: true,
    },
    eventId: {
      type: String,
      required: true,
      trim: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: [...TRANSACTION_STATUSES],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    debitAccount: {
      type: String,
      trim: true,
    },
    creditAccount: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * The authoritative duplicate guard (docs/redis-locking.md): Redis only
 * coordinates, this index is what makes a duplicate event impossible even
 * if the lock expires mid-flight. Scoped to the tenant, so two tenants may
 * legitimately process the same eventId.
 */
transactionSchema.index({ tenantId: 1, eventId: 1 }, { unique: true, name: 'tenant_event_unique' });

const entrySchema = new Schema<LedgerEntry>(
  {
    tenantId: {
      type: String,
      required: true,
      trim: true,
    },
    eventId: {
      type: String,
      required: true,
      trim: true,
    },
    side: {
      type: String,
      enum: ['DEBIT', 'CREDIT'],
      required: true,
    },
    account: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

entrySchema.index(
  { tenantId: 1, eventId: 1, side: 1 },
  { unique: true, name: 'tenant_event_side_unique' },
);

export const LedgerTransactionModel: Model<LedgerTransaction> =
  (mongoose.models.LedgerTransaction as Model<LedgerTransaction>) ||
  mongoose.model<LedgerTransaction>('LedgerTransaction', transactionSchema, 'ledger_transactions');

export const LedgerEntryModel: Model<LedgerEntry> =
  (mongoose.models.LedgerEntry as Model<LedgerEntry>) ||
  mongoose.model<LedgerEntry>('LedgerEntry', entrySchema, 'ledger_entries');
