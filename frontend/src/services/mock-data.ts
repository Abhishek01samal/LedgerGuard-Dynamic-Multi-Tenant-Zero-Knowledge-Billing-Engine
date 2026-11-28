import { endOfDay, format, parseISO, startOfDay, startOfMonth, startOfWeek, subDays } from 'date-fns';
import type { AuthUser } from '../types/auth.types';
import type {
  AnalyticsSummary,
  ExpenditureData,
  Period,
  TransactionStats,
  UsageLimit,
  UsageStatsData,
} from '../types/analytics.types';
import type { CreateTransactionInput, TransactionView } from '../types/ledger.types';

const TRANSACTIONS_KEY = 'ledgerguard_demo_transactions_v1';
const USER_KEY = 'ledgerguard_demo_user_v1';
const MONTHLY_LIMIT_MINOR = 500_000;

export const demoUsers: AuthUser[] = [
  { id: 'user_a', email: 'admin@companya.com', tenantId: 'company_A', role: 'admin' },
  { id: 'user_b', email: 'admin@companyb.com', tenantId: 'company_B', role: 'admin' },
];

interface DemoTransaction extends TransactionView {
  tenantId: string;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;
const amountMinor = (transaction: TransactionView): number => Math.round(transaction.amount * 100);

function transaction(
  tenantId: string,
  daysAgo: number,
  amount: number,
  status: TransactionView['status'],
  description: string,
  index: number,
): DemoTransaction {
  const createdAt = subDays(new Date(), daysAgo).toISOString();
  return {
    tenantId,
    transactionId: `txn_demo_${tenantId}_${String(index).padStart(3, '0')}`,
    eventId: `evt_demo_${tenantId}_${String(index).padStart(3, '0')}`,
    status,
    amount,
    currency: 'INR',
    description,
    debitAccount: 'customer_001',
    creditAccount: 'merchant_001',
    failureReason: status === 'FAILED' ? 'Ledger imbalance: simulated rollback' : null,
    attempts: status === 'FAILED' ? 1 : 2,
    createdAt,
    completedAt: status === 'COMPLETED' ? createdAt : null,
  };
}

function seedTransactions(): DemoTransaction[] {
  const companyA = [
    transaction('company_A', 1, 650, 'COMPLETED', 'Monthly subscription', 1),
    transaction('company_A', 3, 199, 'COMPLETED', 'API overage', 2),
    transaction('company_A', 4, 2400, 'FAILED', 'Annual plan (rolled back)', 3),
    transaction('company_A', 7, 349, 'COMPLETED', 'Seat expansion', 4),
    transaction('company_A', 9, 550, 'COMPLETED', 'Usage top-up', 5),
    transaction('company_A', 12, 120, 'COMPLETED', 'Support add-on', 6),
    transaction('company_A', 16, 700, 'COMPLETED', 'Monthly subscription', 7),
    transaction('company_A', 21, 640, 'FAILED', 'Duplicate event (rolled back)', 8),
    transaction('company_A', 25, 400, 'COMPLETED', 'Storage quota', 9),
  ];
  const companyB = [
    transaction('company_B', 2, 480, 'COMPLETED', 'Monthly subscription', 10),
    transaction('company_B', 6, 650, 'COMPLETED', 'Seat expansion', 11),
    transaction('company_B', 11, 410, 'FAILED', 'Ledger imbalance (rolled back)', 12),
    transaction('company_B', 18, 390, 'COMPLETED', 'Usage top-up', 13),
    transaction('company_B', 28, 520, 'COMPLETED', 'Annual plan', 14),
  ];
  return [...companyA, ...companyB].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function readTransactions(): DemoTransaction[] {
  try {
    const stored = localStorage.getItem(TRANSACTIONS_KEY);
    if (stored) return JSON.parse(stored) as DemoTransaction[];
  } catch {
    // Corrupt or unavailable storage falls back to the seed below.
  }
  const seeded = seedTransactions();
  writeTransactions(seeded);
  return seeded;
}

function writeTransactions(rows: DemoTransaction[]): void {
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(rows));
  } catch {
    // Demo mode still works in memory for this page load.
  }
}

export function getDemoUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setDemoUser(user: AuthUser | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // Ignore storage failures in private browsing modes.
  }
}

export function loginWithDemo(email: string, password: string): AuthUser {
  const user = demoUsers.find((candidate) => candidate.email === email.trim().toLowerCase());
  if (!user || password !== 'password123') throw new Error('Invalid email or password');
  setDemoUser(user);
  return user;
}

export function addDemoTransaction(input: CreateTransactionInput, user: AuthUser): TransactionView {
  const rows = readTransactions();
  const createdAt = new Date().toISOString();
  const transaction: DemoTransaction = {
    tenantId: user.tenantId,
    transactionId: `txn_demo_${Date.now().toString(36)}`,
    eventId: input.eventId,
    status: 'COMPLETED',
    amount: input.amount,
    currency: input.currency,
    description: input.description,
    debitAccount: input.debitAccount,
    creditAccount: input.creditAccount,
    failureReason: null,
    attempts: 1,
    createdAt,
    completedAt: createdAt,
  };
  writeTransactions([transaction, ...rows]);
  return transaction;
}

export function listDemoTransactions(
  user: AuthUser,
  params: { page?: number; limit?: number; status?: string; search?: string },
): { transactions: TransactionView[]; pagination: { page: number; limit: number; total: number; totalPages: number } } {
  const query = params.search?.trim().toLowerCase() ?? '';
  const rows = readTransactions()
    .filter((row) => row.tenantId === user.tenantId)
    .filter((row) => {
      if (params.status && row.status !== params.status) return false;
      if (!query) return true;
      return `${row.eventId} ${row.transactionId} ${row.description}`.toLowerCase().includes(query);
    });

  const page = params.page ?? 1;
  const limit = params.limit ?? 25;
  const total = rows.length;
  return {
    transactions: rows.slice((page - 1) * limit, page * limit),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export function getDemoTransaction(user: AuthUser, id: string): TransactionView | null {
  return listDemoTransactions(user, { limit: 500 }).transactions.find((row) => row.transactionId === id) ?? null;
}

function inRange(rows: TransactionView[], params: { from?: string; to?: string; currency?: string }): TransactionView[] {
  const from = params.from ? startOfDay(parseISO(params.from)).getTime() : -Infinity;
  const to = params.to ? endOfDay(parseISO(params.to)).getTime() : Infinity;
  const currency = params.currency ?? 'INR';
  return rows.filter((row) => {
    const time = new Date(row.createdAt).getTime();
    return time >= from && time <= to && row.currency === currency;
  });
}

function tenantRows(user: AuthUser, params: { from?: string; to?: string; currency?: string }): TransactionView[] {
  return inRange(listDemoTransactions(user, { limit: 500 }).transactions, params);
}

function bucketStart(date: Date, period: Period): Date {
  if (period === 'monthly') return startOfMonth(date);
  if (period === 'weekly') return startOfWeek(date, { weekStartsOn: 1 });
  return startOfDay(date);
}

function buckets(rows: TransactionView[], period: Period): Date[] {
  const starts = rows.map((row) => bucketStart(new Date(row.createdAt), period).getTime());
  if (starts.length === 0) return [];
  const seen = new Set<number>();
  for (const start of starts) seen.add(start);
  return [...seen].sort((a, b) => a - b).map((value) => new Date(value));
}

function label(date: Date, period: Period): string {
  if (period === 'monthly') return format(date, 'MMMM');
  if (period === 'weekly') return `Week of ${format(date, 'yyyy-MM-dd')}`;
  return format(date, 'yyyy-MM-dd');
}

export function demoSummary(user: AuthUser, params: { from?: string; to?: string; currency?: string }): AnalyticsSummary {
  const rows = tenantRows(user, params);
  const completed = rows.filter((row) => row.status === 'COMPLETED');
  const failed = rows.filter((row) => row.status === 'FAILED');
  return {
    totalTransactions: rows.length,
    successfulTransactions: completed.length,
    failedTransactions: failed.length,
    totalExpenditure: completed.reduce((sum, row) => sum + amountMinor(row), 0),
    currency: params.currency ?? 'INR',
    successRate: rows.length === 0 ? 0 : round2((completed.length / rows.length) * 100),
  };
}

export function demoExpenditure(
  user: AuthUser,
  params: { from?: string; to?: string; currency?: string; period: Period },
): ExpenditureData {
  const rows = tenantRows(user, params);
  return {
    currency: params.currency ?? 'INR',
    period: params.period,
    points: buckets(rows, params.period).map((date) => ({
      date: format(date, 'yyyy-MM-dd'),
      label: label(date, params.period),
      amountMinor: rows
        .filter(
          (row) =>
            row.status === 'COMPLETED' &&
            bucketStart(new Date(row.createdAt), params.period).getTime() === date.getTime(),
        )
        .reduce((sum, row) => sum + amountMinor(row), 0),
    })),
  };
}

export function demoUsage(
  user: AuthUser,
  params: { from?: string; to?: string; currency?: string; period: Period },
): UsageStatsData {
  const rows = tenantRows(user, params);
  return {
    period: params.period,
    points: buckets(rows, params.period).map((date) => {
      const group = rows.filter(
        (row) => bucketStart(new Date(row.createdAt), params.period).getTime() === date.getTime(),
      );
      return {
        date: format(date, 'yyyy-MM-dd'),
        transactions: group.length,
        successful: group.filter((row) => row.status === 'COMPLETED').length,
        failed: group.filter((row) => row.status === 'FAILED').length,
      };
    }),
  };
}

export function demoStats(user: AuthUser, params: { from?: string; to?: string; currency?: string }): TransactionStats {
  const rows = tenantRows(user, params);
  const completed = rows.filter((row) => row.status === 'COMPLETED').length;
  const failed = rows.filter((row) => row.status === 'FAILED').length;
  const pending = rows.filter((row) => row.status === 'PENDING' || row.status === 'PROCESSING').length;
  return {
    total: rows.length,
    completed,
    failed,
    pending,
    successRate: rows.length === 0 ? 0 : round2((completed / rows.length) * 100),
    failureRate: rows.length === 0 ? 0 : round2((failed / rows.length) * 100),
  };
}

export function demoLimits(user: AuthUser, currency = 'INR'): UsageLimit {
  const monthStart = startOfMonth(new Date()).getTime();
  const usedMinor = listDemoTransactions(user, { limit: 500 })
    .transactions.filter(
      (row) =>
        row.status === 'COMPLETED' &&
        row.currency === currency &&
        new Date(row.createdAt).getTime() >= monthStart,
    )
    .reduce((sum, row) => sum + amountMinor(row), 0);
  const usagePercentage = round2((usedMinor / MONTHLY_LIMIT_MINOR) * 100);
  return {
    currency,
    period: 'monthly',
    limitMinor: MONTHLY_LIMIT_MINOR,
    usedMinor,
    remainingMinor: Math.max(0, MONTHLY_LIMIT_MINOR - usedMinor),
    usagePercentage,
    thresholdReached: usagePercentage >= 80,
  };
}

export function demoReceiptSignature(transactionId: string): string {
  return `demo_rsa_sha256_${transactionId.slice(0, 24)}`;
}
