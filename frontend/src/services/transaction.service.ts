import type { Transaction } from '../types';
import { INITIAL_TRANSACTIONS } from './mockData';

let transactionsStore: Transaction[] = [...INITIAL_TRANSACTIONS];

export const transactionService = {
  async getTransactions(tenantId?: string, search?: string): Promise<Transaction[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));

    return transactionsStore.filter((tx) => {
      const matchesTenant = !tenantId || tx.tenantId === tenantId;
      const matchesSearch =
        !search ||
        tx.customerName.toLowerCase().includes(search.toLowerCase()) ||
        tx.id.toLowerCase().includes(search.toLowerCase()) ||
        tx.invoiceId.toLowerCase().includes(search.toLowerCase());
      return matchesTenant && matchesSearch;
    });
  },
};
