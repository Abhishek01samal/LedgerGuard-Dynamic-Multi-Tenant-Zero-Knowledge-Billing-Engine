import { createHash } from 'node:crypto';
import { getLedgerModelsForTenant } from '../modules/ledger/ledger.model';
import type { LedgerTransaction } from '../modules/ledger/ledger.model';
import type { Lock } from './lock.service';

export interface IdempotencyContext {
  tenantId: string;
  eventId: string;
  requestHash: string;
}

export type StoredTransaction = Pick<
  LedgerTransaction,
  'transactionId' | 'eventId' | 'status' | 'amount' | 'currency' | 'description' | 'requestHash'
>;

/** Decisions that end the request without processing anything. */
export type TerminalDecision =
  | { kind: 'replay'; transaction: StoredTransaction } // same key + payload: original result
  | { kind: 'conflict' } // same key, different payload -> 409
  | { kind: 'in_progress' }; // someone else is processing it -> retryable 409

export type IdempotencyDecision = TerminalDecision | { kind: 'proceed'; lock: Lock | null };

const HASH_FIELDS = [
  'eventId',
  'description',
  'amount',
  'currency',
  'debitAccount',
  'creditAccount',
] as const;

/** Stable fingerprint: same fields, same order, raw values (1000 differs from "1000"). */
export function hashRequestPayload(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(HASH_FIELDS.map((field) => payload[field] ?? null));
  return createHash('sha256').update(canonical).digest('hex');
}

/** The DURABLE record. Redis is never consulted to decide whether an event completed. */
export async function findStoredTransaction(
  tenantId: string,
  eventId: string,
): Promise<StoredTransaction | null> {
  const { Transaction } = await getLedgerModelsForTenant(tenantId);
  return Transaction.findOne({ tenantId, eventId })
    .select('transactionId eventId status amount currency description requestHash')
    .lean<StoredTransaction | null>()
    .exec();
}

function classify(ctx: IdempotencyContext, stored: StoredTransaction): TerminalDecision {
  if (stored.requestHash !== ctx.requestHash) return { kind: 'conflict' };
  if (stored.status === 'COMPLETED' || stored.status === 'FAILED') {
    return { kind: 'replay', transaction: stored };
  }
  return { kind: 'in_progress' };
}

async function decideFromDatabase(ctx: IdempotencyContext): Promise<TerminalDecision | null> {
  const stored = await findStoredTransaction(ctx.tenantId, ctx.eventId);
  return stored ? classify(ctx, stored) : null;
}

/** Day 2 skeleton: database-only decision, no lock yet. Replaced on Day 3. */
export async function beginIdempotentRequest(
  ctx: IdempotencyContext,
): Promise<IdempotencyDecision> {
  const decided = await decideFromDatabase(ctx);
  return decided ?? { kind: 'proceed', lock: null };
}
