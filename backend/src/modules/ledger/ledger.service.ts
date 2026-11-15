import { AppError } from '../../middleware/error.middleware';
import type {
  CreateTransactionInput,
  CreateTransactionResponse,
  LedgerSummary,
  ListTransactionsQuery,
  PaginatedTransactions,
  TenantContext,
  TransactionDetailView,
} from './ledger.types';

const notImplemented = (what: string): AppError =>
  new AppError(501, `${what} is not implemented yet`, 'NOT_IMPLEMENTED');

/** Day 1 skeleton: signatures are final, bodies land on Days 2-4. */
export class LedgerService {
  createTransaction(
    _ctx: TenantContext,
    _input: CreateTransactionInput,
    _idempotencyKey: string,
  ): Promise<{ transaction: CreateTransactionResponse; replayed: boolean }> {
    return Promise.reject(notImplemented('Create transaction'));
  }

  listTransactions(_ctx: TenantContext, _query: ListTransactionsQuery): Promise<PaginatedTransactions> {
    return Promise.reject(notImplemented('List transactions'));
  }

  getTransaction(_ctx: TenantContext, _transactionId: string): Promise<TransactionDetailView> {
    return Promise.reject(notImplemented('Get transaction'));
  }

  getSummary(_ctx: TenantContext, _currency: LedgerSummary['currency']): Promise<LedgerSummary> {
    return Promise.reject(notImplemented('Ledger summary'));
  }
}
