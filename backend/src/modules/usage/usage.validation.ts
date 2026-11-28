import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../ledger/ledger.types';

const emptyToUndefined = (v: unknown): unknown => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const usageLimitsQuerySchema = z.object({
  currency: z.preprocess(emptyToUndefined, z.enum(SUPPORTED_CURRENCIES).default('INR')),
});

export const upsertUsageLimitSchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES).default('INR'),
  limitMinor: z.number().int().positive().max(1_000_000_000_000),
  period: z.literal('monthly').default('monthly'),
});
