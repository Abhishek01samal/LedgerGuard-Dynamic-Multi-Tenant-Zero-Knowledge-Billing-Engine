// backend/src/modules/analytics/analytics.service.ts
// Day 3 – Person 1. Runs pipelines on the TENANT connection, zero-fills gaps, shapes API responses.
import type { Connection } from "mongoose";
import {
  expenditurePipeline,
  summaryPipeline,
  usagePipeline,
} from "./analytics.aggregation";
import {
  TRANSACTION_COLLECTION,
  type AnalyticsSummary,
  type DateRange,
  type ExpenditureData,
  type ExpenditureRow,
  type Period,
  type SummaryRow,
  type TransactionStatsData,
  type UsageRow,
  type UsageStatsData,
} from "./analytics.types";
import {
  resolveDateRange,
  resolveYearRange,
  type ExpenditureQuery,
  type SummaryQuery,
  type UsageQuery,
} from "./analytics.validation";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const round2 = (n: number) => Math.round(n * 100) / 100;
const pct = (part: number, whole: number) => (whole === 0 ? 0 : round2((part / whole) * 100));
const iso = (d: Date) => d.toISOString().slice(0, 10);

function collection(conn: Connection) {
  if (!conn.db) throw new Error("Tenant database connection is not ready");
  return conn.db.collection(TRANSACTION_COLLECTION);
}

/** Start of the bucket (UTC) that contains `d`. */
function bucketStart(d: Date, period: Period): Date {
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
  if (period === "monthly") return new Date(Date.UTC(y, m, 1));
  if (period === "daily") return new Date(Date.UTC(y, m, day));
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(Date.UTC(y, m, day - dow));
}

function nextBucket(d: Date, period: Period): Date {
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
  if (period === "monthly") return new Date(Date.UTC(y, m + 1, 1));
  return new Date(Date.UTC(y, m, day + (period === "weekly" ? 7 : 1)));
}

/** Every bucket start between range.from and range.to (exclusive) so charts have no gaps. */
function buildBuckets(range: DateRange, period: Period): Date[] {
  const out: Date[] = [];
  for (let d = bucketStart(range.from, period); d < range.to; d = nextBucket(d, period)) out.push(d);
  return out;
}

function labelFor(d: Date, period: Period): string {
  if (period === "monthly") return MONTHS[d.getUTCMonth()] ?? "";
  if (period === "weekly") return `Week of ${iso(d)}`;
  return iso(d);
}

// ---------------------------------------------------------------- API 1
async function runSummary(conn: Connection, tenantId: string, range: DateRange, currency: string) {
  const rows = await collection(conn)
    .aggregate<SummaryRow>(summaryPipeline(tenantId, range, currency))
    .toArray();
  return rows[0] ?? { total: 0, completed: 0, failed: 0, pending: 0, expenditure: 0 };
}

export async function getSummary(
  conn: Connection,
  tenantId: string,
  q: SummaryQuery
): Promise<AnalyticsSummary> {
  const range = resolveDateRange(q.from, q.to);
  const r = await runSummary(conn, tenantId, range, q.currency);
  return {
    totalTransactions: r.total,
    successfulTransactions: r.completed,
    failedTransactions: r.failed,
    totalExpenditure: r.expenditure,
    currency: q.currency,
    successRate: pct(r.completed, r.total),
  };
}

// ---------------------------------------------------------------- API 5
export async function getTransactionStats(
  conn: Connection,
  tenantId: string,
  q: SummaryQuery
): Promise<TransactionStatsData> {
  const range = resolveDateRange(q.from, q.to);
  const r = await runSummary(conn, tenantId, range, q.currency);
  return {
    total: r.total,
    completed: r.completed,
    failed: r.failed,
    pending: r.pending,
    successRate: pct(r.completed, r.total),
    failureRate: pct(r.failed, r.total),
  };
}

// ---------------------------------------------------------------- API 2
export async function getExpenditure(
  conn: Connection,
  tenantId: string,
  q: ExpenditureQuery
): Promise<ExpenditureData> {
  let range: DateRange;
  if (q.from || q.to) range = resolveDateRange(q.from, q.to);
  else if (q.period === "monthly") range = resolveYearRange(q.year ?? new Date().getUTCFullYear());
  else range = resolveDateRange(undefined, undefined, 30);

  const rows = await collection(conn)
    .aggregate<ExpenditureRow>(expenditurePipeline(tenantId, range, q.period, q.currency))
    .toArray();

  const byDate = new Map(rows.map((r) => [iso(r._id), r.amountMinor]));
  const points = buildBuckets(range, q.period).map((d) => ({
    label: labelFor(d, q.period),
    date: iso(d),
    amountMinor: byDate.get(iso(d)) ?? 0,
  }));

  return { currency: q.currency, period: q.period, points };
}

// ---------------------------------------------------------------- API 3
export async function getUsageStats(
  conn: Connection,
  tenantId: string,
  q: UsageQuery
): Promise<UsageStatsData> {
  const range = resolveDateRange(q.from, q.to);
  const rows = await collection(conn)
    .aggregate<UsageRow>(usagePipeline(tenantId, range, q.period))
    .toArray();

  const byDate = new Map(rows.map((r) => [iso(r._id), r]));
  const points = buildBuckets(range, q.period).map((d) => {
    const r = byDate.get(iso(d));
    return {
      date: iso(d),
      transactions: r?.transactions ?? 0,
      successful: r?.successful ?? 0,
      failed: r?.failed ?? 0,
    };
  });

  return { period: q.period, points };
}
