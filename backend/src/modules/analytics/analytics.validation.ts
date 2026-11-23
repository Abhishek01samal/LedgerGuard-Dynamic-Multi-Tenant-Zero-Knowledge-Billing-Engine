// backend/src/modules/analytics/analytics.validation.ts
// Day 1 – Person 1. Zod schemas + date-range resolution (UTC).
import { z } from "zod";
import { DEFAULT_CURRENCY, PERIODS, type DateRange } from "./analytics.types";

const MS_DAY = 86_400_000;
const MAX_RANGE_DAYS = 366;

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00.000Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, "Invalid calendar date");

const currency = z
  .string()
  .length(3, "Currency must be a 3-letter ISO code")
  .default(DEFAULT_CURRENCY)
  .transform((c) => c.toUpperCase());

const parse = (s: string) => new Date(`${s}T00:00:00.000Z`);

const rangeRefine = (v: { from?: string; to?: string }, ctx: z.RefinementCtx) => {
  if (v.from && v.to) {
    const f = parse(v.from).getTime();
    const t = parse(v.to).getTime();
    if (f > t) {
      ctx.addIssue({ code: "custom", path: ["from"], message: "`from` must be on or before `to`" });
    } else if ((t - f) / MS_DAY + 1 > MAX_RANGE_DAYS) {
      ctx.addIssue({ code: "custom", path: ["to"], message: `Range cannot exceed ${MAX_RANGE_DAYS} days` });
    }
  }
};

// NOTE: tenantId is deliberately NOT accepted. z.object() strips unknown keys,
// and the tenant always comes from the verified JWT / tenant connection.

export const summaryQuerySchema = z
  .object({ from: dateString.optional(), to: dateString.optional(), currency })
  .superRefine(rangeRefine);

export const transactionsQuerySchema = summaryQuerySchema;

export const expenditureQuerySchema = z
  .object({
    period: z.enum(PERIODS).default("monthly"),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    from: dateString.optional(),
    to: dateString.optional(),
    currency,
  })
  .superRefine(rangeRefine);

export const usageQuerySchema = z
  .object({
    period: z.enum(PERIODS).default("daily"),
    from: dateString.optional(),
    to: dateString.optional(),
  })
  .superRefine(rangeRefine);

export type SummaryQuery = z.infer<typeof summaryQuerySchema>;
export type ExpenditureQuery = z.infer<typeof expenditureQuerySchema>;
export type UsageQuery = z.infer<typeof usageQuerySchema>;

const startOfTodayUtc = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
};

/**
 * Turns optional YYYY-MM-DD strings into a UTC [from, to) range.
 * Defaults: last `defaultDays` days ending today (inclusive).
 */
export function resolveDateRange(from?: string, to?: string, defaultDays = 30): DateRange {
  const endDay = to ? parse(to) : startOfTodayUtc();
  const startDay = from ? parse(from) : new Date(endDay.getTime() - (defaultDays - 1) * MS_DAY);
  return { from: startDay, to: new Date(endDay.getTime() + MS_DAY) };
}

/** Range for a whole calendar year (UTC). */
export function resolveYearRange(year: number): DateRange {
  return { from: new Date(Date.UTC(year, 0, 1)), to: new Date(Date.UTC(year + 1, 0, 1)) };
}
