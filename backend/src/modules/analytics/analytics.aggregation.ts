// backend/src/modules/analytics/analytics.aggregation.ts
// Day 2 – Person 1. Pure pipeline builders (no DB access) so Person 4 can unit-test them.
import type { Document } from "mongodb";
import { TX_FIELDS as F, TX_STATUS as S, type DateRange, type Period } from "./analytics.types";

const UNIT: Record<Period, "day" | "week" | "month"> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
};

/**
 * Base filter used by every pipeline.
 * - tenantId is matched even though each tenant has its own connection (defence in depth).
 * - createdAt range is [from, to) in UTC.
 */
export function baseMatch(tenantId: string, range: DateRange): Document {
  return {
    [F.tenantId]: tenantId,
    [F.createdAt]: { $gte: range.from, $lt: range.to },
    // If your ledger stores debit AND credit rows for one payment, count only one side here, e.g.:
    // entryType: "DEBIT",
  };
}

const countIf = (status: string): Document => ({
  $sum: { $cond: [{ $eq: [`$${F.status}`, status] }, 1, 0] },
});

/** API 1 + API 5: one pass over the data, counts for every status + expenditure for ONE currency. */
export function summaryPipeline(tenantId: string, range: DateRange, currency: string): Document[] {
  return [
    { $match: baseMatch(tenantId, range) },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: countIf(S.COMPLETED),
        failed: countIf(S.FAILED),
        pending: countIf(S.PENDING),
        expenditure: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: [`$${F.status}`, S.COMPLETED] },
                  { $eq: [`$${F.currency}`, currency] }, // never mix currencies
                ],
              },
              `$${F.amountMinor}`,
              0,
            ],
          },
        },
      },
    },
    { $project: { _id: 0 } },
  ];
}

/** API 2: expenditure per day / ISO week (Mon start) / month. COMPLETED + one currency only. */
export function expenditurePipeline(
  tenantId: string,
  range: DateRange,
  period: Period,
  currency: string
): Document[] {
  return [
    {
      $match: {
        ...baseMatch(tenantId, range),
        [F.status]: S.COMPLETED,
        [F.currency]: currency,
      },
    },
    {
      $group: {
        _id: {
          $dateTrunc: {
            date: `$${F.createdAt}`,
            unit: UNIT[period],
            timezone: "UTC",
            startOfWeek: "monday",
          },
        },
        amountMinor: { $sum: `$${F.amountMinor}` },
      },
    },
    { $sort: { _id: 1 } },
  ];
}

/** API 3: transaction counts per period bucket, split by outcome. */
export function usagePipeline(tenantId: string, range: DateRange, period: Period): Document[] {
  return [
    { $match: baseMatch(tenantId, range) },
    {
      $group: {
        _id: {
          $dateTrunc: {
            date: `$${F.createdAt}`,
            unit: UNIT[period],
            timezone: "UTC",
            startOfWeek: "monday",
          },
        },
        transactions: { $sum: 1 },
        successful: countIf(S.COMPLETED),
        failed: countIf(S.FAILED),
      },
    },
    { $sort: { _id: 1 } },
  ];
}
