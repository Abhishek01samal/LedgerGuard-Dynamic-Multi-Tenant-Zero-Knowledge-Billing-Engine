import { z } from 'zod';
import { SUPPORTED_CURRENCIES, TRANSACTION_STATUSES } from './ledger.types';

const ID_PATTERN = /^[A-Za-z0-9_.:-]{3,128}$/;
const ACCOUNT_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** Max 2 decimal places; tolerant to binary float noise (e.g. 10.1 * 100). */
function hasAtMostTwoDecimals(n: number): boolean {
  return Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
}

const accountId = z
  .string({ required_error: 'Account is required' })
  .trim()
  .regex(ACCOUNT_PATTERN, 'Account may contain letters, digits, "_" and "-" (max 64)');

export const eventIdSchema = z
  .string({ required_error: 'eventId is required' })
  .trim()
  .regex(ID_PATTERN, 'eventId may contain letters, digits, "_", ".", ":" and "-" (3-128 chars)');

export const createTransactionSchema = z
  .object({
    eventId: eventIdSchema,
    description: z.string().trim().min(1, 'Description is required').max(200),
    amount: z
      .number({ invalid_type_error: 'Amount must be a number', required_error: 'Amount is required' })
      .finite()
      .positive('Amount must be greater than zero')
      .max(1_000_000_000, 'Amount is too large')
      .refine(hasAtMostTwoDecimals, 'Amount can have at most 2 decimal places'),
    currency: z.enum(SUPPORTED_CURRENCIES, {
      errorMap: () => ({ message: `Currency must be one of ${SUPPORTED_CURRENCIES.join(', ')}` }),
    }),
    debitAccount: accountId,
    creditAccount: accountId,
  })
  .strict()
  .refine((d) => d.debitAccount !== d.creditAccount, {
    path: ['creditAccount'],
    message: 'Debit and credit accounts must be different',
  });

export const idempotencyKeySchema = z
  .string({ required_error: 'Idempotency-Key header is required' })
  .trim()
  .regex(ID_PATTERN, 'Idempotency-Key header is invalid');

/** Query strings arrive as "" from empty form fields; treat that as "not set". */
const emptyToUndefined = (v: unknown): unknown => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const listQuerySchema = z
  .object({
    page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
    limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(100).default(10)),
    status: z.preprocess(emptyToUndefined, z.enum(TRANSACTION_STATUSES).optional()),
    search: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
    from: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
    to: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    path: ['from'],
    message: '"from" must not be after "to"',
  });

export const summaryQuerySchema = z.object({
  currency: z.preprocess(emptyToUndefined, z.enum(SUPPORTED_CURRENCIES).default('INR')),
});

export const transactionIdParamSchema = z.object({
  id: z.string().regex(/^txn_[A-Za-z0-9-]{3,64}$/, 'Invalid transaction id'),
});
