import { z } from 'zod';

/**
 * CreateTransactionRequest (shared/contracts/ledger.contract.ts).
 * Money is a positive integer (minor units) - floats, strings and null are
 * rejected before anything reaches the ledger.
 */
export const createTransactionSchema = z
  .object({
    eventId: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(500),
    amount: z.number().int().positive(),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO code (e.g. INR)'),
    debitAccount: z.string().trim().min(1).max(200),
    creditAccount: z.string().trim().min(1).max(200),
  })
  .refine((value) => value.debitAccount !== value.creditAccount, {
    message: 'debitAccount and creditAccount must be different',
    path: ['creditAccount'],
  });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

/** Page/limit query values: positive integers, anything else falls back to the default. */
export function positiveInt(value: unknown, fallback: number): number {
  const parsed = typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}
