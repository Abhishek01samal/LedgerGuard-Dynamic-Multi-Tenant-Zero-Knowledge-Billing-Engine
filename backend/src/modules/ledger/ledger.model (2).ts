import { randomBytes } from 'node:crypto';
import { Schema } from 'mongoose';
import type { Connection, Model } from 'mongoose';
import { getTenantConnection } from '../../database/tenant.connection';

/**
 * Ledger schema (Person 2 owns it, Person 1 consumes it).
 * Kept in step with shared/contracts/ledger.contract.ts. Production code does not import
 * from shared/, so the statuses are mirrored here.
 */
export const TRANSACTION_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const ENTRY_TYPES = ['DEBIT', 'CREDIT'] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export interface LedgerTransaction {
  transactionId: string;
  tenantId: string;
  eventId: string;
  /** sha256 of the request fields; detects "same key, different payload". */
  requestHash: string;
  description: string;
  /** Positive integer (minor units). Never a float. */
  amount: number;
  currency: string;
  debitAccount: string;
  creditAccount: string;
  status: TransactionStatus;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LedgerEntry {
  transactionId: string;
  tenantId: string;
  eventId: string;
  account: string;
  entryType: EntryType;
  amount: number;
  currency: string;
  createdAt: Date;
}

const positiveInteger = {
  validator: (value: number): boolean => Number.isSafeInteger(value) && value > 0,
  message: 'amount must be a positive integer',
};

export const ledgerTransactionSchema = new Schema<LedgerTransaction>(
  {
    transactionId: {
      type: String,
      required: true,
      default: () => `txn_${randomBytes(8).toString('hex')}`,
    },
    tenantId: { type: String, required: true },
    eventId: { type: String, required: true, maxlength: 128 },
    requestHash: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true, validate: positiveInteger },
    currency: { type: String, required: true, match: /^[A-Z]{3}$/ },
    debitAccount: { type: String, required: true },
    creditAccount: { type: String, required: true },
    status: { type: String, enum: [...TRANSACTION_STATUSES], required: true },
    failureReason: { type: String },
  },
  { timestamps: true, collection: 'ledger_transactions' },
);

// The AUTHORITATIVE duplicate guard. Redis is only coordination.
ledgerTransactionSchema.index(
  { tenantId: 1, eventId: 1 },
  { unique: true, name: 'uniq_tenant_event' },
);
ledgerTransactionSchema.index({ transactionId: 1 }, { unique: true, name: 'uniq_transaction_id' });
ledgerTransactionSchema.index({ tenantId: 1, createdAt: -1 }, { name: 'tenant_recent' });
ledgerTransactionSchema.index({ tenantId: 1, status: 1 }, { name: 'tenant_status' });

export const ledgerEntrySchema = new Schema<LedgerEntry>(
  {
    transactionId: { type: String, required: true },
    tenantId: { type: String, required: true },
    eventId: { type: String, required: true },
    account: { type: String, required: true },
    entryType: { type: String, enum: [...ENTRY_TYPES], required: true },
    amount: { type: Number, required: true, validate: positiveInteger },
    currency: { type: String, required: true, match: /^[A-Z]{3}$/ },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'ledger_entries' },
);

// One debit and one credit per event, ever.
ledgerEntrySchema.index(
  { tenantId: 1, eventId: 1, entryType: 1 },
  { unique: true, name: 'uniq_tenant_event_entry' },
);
ledgerEntrySchema.index({ transactionId: 1 }, { name: 'by_transaction' });

export interface LedgerModels {
  Transaction: Model<LedgerTransaction>;
  Entry: Model<LedgerEntry>;
}

const ready = new WeakMap<Connection, Promise<LedgerModels>>();

/** Register the models on a tenant connection and make sure collections and indexes exist. */
export function ensureLedgerModels(connection: Connection): Promise<LedgerModels> {
  const cached = ready.get(connection);
  if (cached) return cached;

  const setup = (async (): Promise<LedgerModels> => {
    const Transaction =
      (connection.models.LedgerTransaction as Model<LedgerTransaction> | undefined) ??
      connection.model<LedgerTransaction>('LedgerTransaction', ledgerTransactionSchema);
    const Entry =
      (connection.models.LedgerEntry as Model<LedgerEntry> | undefined) ??
      connection.model<LedgerEntry>('LedgerEntry', ledgerEntrySchema);

    for (const model of [Transaction, Entry]) {
      try {
        await model.createCollection(); // transactions need the collection to exist
      } catch (err) {
        if ((err as { code?: number }).code !== 48) throw err; // 48 = already exists
      }
      await model.createIndexes(); // the unique indexes must exist BEFORE the first write
    }
    return { Transaction, Entry };
  })();

  ready.set(connection, setup);
  setup.catch(() => ready.delete(connection)); // allow a retry after a failed setup
  return setup;
}

/** The single place that knows how to get a tenant's connection (Week 1 database layer). */
export async function getLedgerModelsForTenant(tenantId: string): Promise<LedgerModels> {
  const connection = await getTenantConnection(tenantId);
  return ensureLedgerModels(connection);
}
