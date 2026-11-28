export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface TransactionView {
  transactionId: string;
  eventId: string;
  status: TransactionStatus;
  amount: number;
  currency: Currency;
  description: string;
  debitAccount: string;
  creditAccount: string;
  failureReason: string | null;
  attempts: number;
  createdAt: string;
  completedAt: string | null;
}

export interface LedgerEntryView {
  accountId: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  currency: Currency;
}

export interface TransactionDetailView extends TransactionView {
  entries: LedgerEntryView[];
}

export interface PaginatedTransactions {
  transactions: TransactionView[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface CreateTransactionInput {
  eventId: string;
  description: string;
  amount: number;
  currency: Currency;
  debitAccount: string;
  creditAccount: string;
}
