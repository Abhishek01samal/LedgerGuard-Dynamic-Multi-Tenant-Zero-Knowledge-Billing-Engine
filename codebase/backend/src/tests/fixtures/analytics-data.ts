// backend/src/tests/fixtures/analytics-data.ts
// Day 1 – Person 4. Deterministic data with HAND-CALCULATED expected results.
// Same boundary data Person 1 uses in seed-analytics-data.ts, so both sides verify against the same numbers.

export const TENANT_A = 'company_A';
export const TENANT_B = 'company_B';
export const TENANT_EMPTY = 'company_empty';

export interface TxRow {
  transactionId: string;
  eventId: string;
  tenantId: string;
  description: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  amountMinor: number;
  currency: string;
  createdAt: Date;
}

const mk = (
  tenantId: string,
  i: number,
  status: TxRow['status'],
  amountMinor: number,
  currency: string,
  iso: string,
): TxRow => ({
  transactionId: `txn_${tenantId}_${i}`,
  eventId: `evt_${tenantId}_${i}`,
  tenantId,
  description: `fixture ${i}`,
  status,
  amountMinor,
  currency,
  createdAt: new Date(iso),
});

/** Company A: boundary-heavy dataset (UTC). 2026-11-01 is a Sunday, 2026-11-30 a Monday. */
export const A_ROWS: TxRow[] = [
  mk(TENANT_A, 0, 'COMPLETED', 100000, 'INR', '2026-11-01T00:00:00.000Z'), // first instant of Nov
  mk(TENANT_A, 1, 'COMPLETED', 50000, 'INR', '2026-11-10T12:00:00.000Z'),
  mk(TENANT_A, 2, 'COMPLETED', 25000, 'INR', '2026-11-30T23:59:59.999Z'), // last instant of Nov
  mk(TENANT_A, 3, 'COMPLETED', 99900, 'USD', '2026-11-10T12:00:00.000Z'), // other currency
  mk(TENANT_A, 4, 'FAILED', 70000, 'INR', '2026-11-10T13:00:00.000Z'), // never counts as spend
  mk(TENANT_A, 5, 'PENDING', 30000, 'INR', '2026-11-11T09:00:00.000Z'), // never counts as spend
  mk(TENANT_A, 6, 'COMPLETED', 40000, 'INR', '2026-10-31T23:59:59.999Z'), // just before Nov
  mk(TENANT_A, 7, 'COMPLETED', 60000, 'INR', '2026-12-01T00:00:00.000Z'), // just after Nov
];

/** Company B: small, different numbers so any leak is obvious. */
export const B_ROWS: TxRow[] = [
  mk(TENANT_B, 0, 'COMPLETED', 10000, 'INR', '2026-11-05T10:00:00.000Z'),
  mk(TENANT_B, 1, 'FAILED', 5000, 'INR', '2026-11-06T10:00:00.000Z'),
];

export const NOV = { from: '2026-11-01', to: '2026-11-30' };

export const EXPECTED = {
  A: {
    novSummaryINR: {
      totalTransactions: 6, // 8 rows minus Oct 31 and Dec 1
      successfulTransactions: 4, // 3 INR + 1 USD
      failedTransactions: 1,
      totalExpenditure: 175000, // 100000 + 50000 + 25000
      currency: 'INR',
      successRate: 66.67,
    },
    novTransactions: {
      total: 6,
      completed: 4,
      failed: 1,
      pending: 1,
      successRate: 66.67,
      failureRate: 16.67,
    },
    novExpenditureUSD: 99900,
    oct31INR: 40000,
    dec01INR: 60000,
    yearMonthlyINR2026: { October: 40000, November: 175000, December: 60000, total: 275000 },
    novDailyINR_Nov10: 50000,
    novWeeklyBuckets: [
      '2026-10-26',
      '2026-11-02',
      '2026-11-09',
      '2026-11-16',
      '2026-11-23',
      '2026-11-30',
    ],
    novWeeklyINR: [100000, 0, 50000, 0, 0, 25000],
    novDailyUsage: {
      '2026-11-01': { transactions: 1, successful: 1, failed: 0 },
      '2026-11-10': { transactions: 3, successful: 2, failed: 1 },
      '2026-11-11': { transactions: 1, successful: 0, failed: 0 },
      '2026-11-30': { transactions: 1, successful: 1, failed: 0 },
    } as Record<string, { transactions: number; successful: number; failed: number }>,
    novWeeklyUsageNov9: { transactions: 4, successful: 2, failed: 1 }, // Nov 10 (3) + Nov 11 (1)
  },
  B: {
    novSummaryINR: {
      totalTransactions: 2,
      successfulTransactions: 1,
      failedTransactions: 1,
      totalExpenditure: 10000,
      currency: 'INR',
      successRate: 50,
    },
  },
};

/** Builds `count` deterministic rows for performance tests. Completed rows are always 1000 minor units. */
export function generateLargeDataset(
  tenantId: string,
  count: number,
  startIso = '2026-01-01T00:00:00.000Z',
) {
  const start = new Date(startIso).getTime();
  const spanMs = 300 * 86_400_000; // spread over 300 days
  const rows: TxRow[] = [];
  let completed = 0;
  for (let i = 0; i < count; i++) {
    const m = i % 10;
    const status: TxRow['status'] = m < 8 ? 'COMPLETED' : m === 8 ? 'FAILED' : 'PENDING';
    if (status === 'COMPLETED') completed++;
    rows.push({
      transactionId: `perf_${tenantId}_${i}`,
      eventId: `perf_evt_${tenantId}_${i}`,
      tenantId,
      description: 'perf',
      status,
      amountMinor: 1000,
      currency: 'INR',
      createdAt: new Date(start + Math.floor((i / count) * spanMs)),
    });
  }
  return { rows, completed, expectedExpenditure: completed * 1000 };
}
