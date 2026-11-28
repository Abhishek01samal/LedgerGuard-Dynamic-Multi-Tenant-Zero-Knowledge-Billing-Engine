import type {
  CreateTransactionInput,
  PaginatedTransactions,
  TransactionDetailView,
  TransactionView,
} from '../types/ledger.types';
import { api, isMockMode } from './api';
import {
  addDemoTransaction,
  demoReceiptSignature,
  getDemoTransaction,
  getDemoUser,
  listDemoTransactions,
} from './mock-data';

function demoUser() {
  const user = getDemoUser();
  if (!user) throw new Error('No demo session. Sign in again.');
  return user;
}

export async function createTransaction(input: CreateTransactionInput): Promise<{
  transaction: Pick<TransactionView, 'transactionId' | 'eventId' | 'status' | 'amount' | 'currency'>;
  replayed: boolean;
}> {
  if (isMockMode()) return { transaction: addDemoTransaction(input, demoUser()), replayed: false };
  const res = await api.post('/api/v1/ledger/transactions', input, {
    headers: { 'Idempotency-Key': input.eventId },
  });
  return {
    transaction: res.data.data,
    replayed: res.headers['idempotent-replayed'] === 'true' || res.status === 200,
  };
}

export async function listTransactions(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<PaginatedTransactions> {
  if (isMockMode()) return listDemoTransactions(demoUser(), params);
  const { data } = await api.get('/api/v1/ledger/transactions', { params });
  return data.data;
}

export async function getTransaction(id: string): Promise<TransactionDetailView> {
  if (isMockMode()) {
    const transaction = getDemoTransaction(demoUser(), id);
    if (!transaction) throw new Error('Transaction not found');
    return {
      ...transaction,
      entries: [
        { accountId: transaction.debitAccount, entryType: 'DEBIT', amount: transaction.amount, currency: transaction.currency },
        { accountId: transaction.creditAccount, entryType: 'CREDIT', amount: transaction.amount, currency: transaction.currency },
      ],
    };
  }
  const { data } = await api.get(`/api/v1/ledger/transactions/${id}`);
  return data.data;
}

export async function getReceipt(transactionId: string): Promise<{ signature: string; valid: boolean }> {
  if (isMockMode()) return { signature: demoReceiptSignature(transactionId), valid: true };
  const { data } = await api.get(`/api/v1/security/receipt/${transactionId}`);
  return { signature: data.data.signature, valid: data.valid === true };
}
