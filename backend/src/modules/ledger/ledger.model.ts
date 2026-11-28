/**
 * Ledger persistence: transaction row + double-entry schemas.
 * Unique indexes: { tenantId, eventId } and { tenantId, transactionId }.
 * Exports getLedgerModels(connection) -> { Transaction, Entry }.
 */
import { Schema, type Connection, type Model } from 'mongoose';
import type { LedgerEntryDoc, LedgerTransactionDoc } from './ledger.types';

const transactionSchema = new Schema<LedgerTransactionDoc>(
  {
    tenantId: { type: String, required: true },
    transactionId: { type: String, required: true },
    eventId: { type: String, required: true },
    payloadHash: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'], required: true },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true },
    description: { type: String, required: true },
    debitAccount: { type: String, required: true },
    creditAccount: { type: String, required: true },
    failureReason: { type: String, default: null },
    attempts: { type: Number, default: 1 },
    createdBy: { type: String, required: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);
transactionSchema.index({ tenantId: 1, eventId: 1 }, { unique: true });
transactionSchema.index({ tenantId: 1, transactionId: 1 }, { unique: true });
transactionSchema.index({ tenantId: 1, createdAt: -1 });

const entrySchema = new Schema<LedgerEntryDoc>(
  {
    tenantId: { type: String, required: true },
    transactionId: { type: String, required: true },
    accountId: { type: String, required: true },
    entryType: { type: String, enum: ['DEBIT', 'CREDIT'], required: true },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);
entrySchema.index({ tenantId: 1, transactionId: 1 });

export interface LedgerModels {
  Transaction: Model<LedgerTransactionDoc>;
  Entry: Model<LedgerEntryDoc>;
}

export function getLedgerModels(connection: Connection): LedgerModels {
  return {
    Transaction:
      (connection.models.LedgerTransaction as Model<LedgerTransactionDoc> | undefined) ??
      connection.model<LedgerTransactionDoc>('LedgerTransaction', transactionSchema, 'ledger_transactions'),
    Entry:
      (connection.models.LedgerEntry as Model<LedgerEntryDoc> | undefined) ??
      connection.model<LedgerEntryDoc>('LedgerEntry', entrySchema, 'ledger_entries'),
  };
}
