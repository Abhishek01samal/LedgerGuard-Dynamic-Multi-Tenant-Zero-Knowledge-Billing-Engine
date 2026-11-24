import type { Transaction } from '../types';
import { INITIAL_TRANSACTIONS } from './mockData';

let transactionsStore: Transaction[] = [...INITIAL_TRANSACTIONS];

export interface TransactionFilterOptions {
  tenantId?: string;
  search?: string;
  status?: 'all' | 'succeeded' | 'pending' | 'failed';
  settlementRail?: 'all' | 'ach' | 'wire' | 'card' | 'crypto' | 'sepa';
  zkOnly?: boolean;
}

export interface ZkProofVerificationResult {
  valid: boolean;
  proofHash: string;
  circuitName: string;
  latencyMs: number;
  blockNumber: number;
  verifiedAt: string;
}

export const transactionService = {
  async getTransactions(options?: TransactionFilterOptions | string): Promise<Transaction[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));

    let tenantId: string | undefined;
    let search: string | undefined;
    let status: string | undefined;
    let rail: string | undefined;
    let zkOnly: boolean | undefined;

    if (typeof options === 'string') {
      tenantId = options;
    } else if (options) {
      tenantId = options.tenantId;
      search = options.search;
      status = options.status;
      rail = options.settlementRail;
      zkOnly = options.zkOnly;
    }

    return transactionsStore.filter((tx) => {
      const matchesTenant = !tenantId || tx.tenantId === tenantId;
      const matchesSearch =
        !search ||
        tx.customerName.toLowerCase().includes(search.toLowerCase()) ||
        tx.id.toLowerCase().includes(search.toLowerCase()) ||
        tx.invoiceId.toLowerCase().includes(search.toLowerCase()) ||
        (tx.proofHash && tx.proofHash.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = !status || status === 'all' || tx.status === status;
      const matchesRail = !rail || rail === 'all' || tx.settlementRail === rail;
      const matchesZk = !zkOnly || tx.zkVerified;

      return matchesTenant && matchesSearch && matchesStatus && matchesRail && matchesZk;
    });
  },

  async getTransactionById(id: string): Promise<Transaction | undefined> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return transactionsStore.find((tx) => tx.id === id);
  },

  async verifyTransactionProof(id: string): Promise<ZkProofVerificationResult> {
    await new Promise((resolve) => setTimeout(resolve, 450)); // simulate cryptographic verification latency
    const tx = transactionsStore.find((t) => t.id === id);

    if (!tx || !tx.proofHash) {
      throw new Error(`Transaction ${id} does not possess a valid cryptographic proof commitment.`);
    }

    return {
      valid: tx.zkVerified && tx.status !== 'failed',
      proofHash: tx.proofHash,
      circuitName: tx.circuitName || 'Groth16/BN254 - BillingSettlementCircuit',
      latencyMs: Math.floor(Math.random() * 40) + 120, // 120-160ms simulated SNARK proof verification
      blockNumber: tx.blockNumber || 4892400,
      verifiedAt: new Date().toISOString(),
    };
  },

  async recordTransaction(
    txData: Omit<Transaction, 'id' | 'timestamp' | 'zkVerified'> & { zkVerified?: boolean }
  ): Promise<Transaction> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const newTx: Transaction = {
      ...txData,
      id: `tx-${Math.floor(800 + Math.random() * 200)}`,
      zkVerified: txData.zkVerified ?? true,
      timestamp: new Date().toISOString(),
      blockNumber: Math.floor(4892500 + Math.random() * 100),
      proofHash:
        txData.proofHash ||
        `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    };

    transactionsStore.unshift(newTx);
    return newTx;
  },

  exportTransactionsCSV(transactions: Transaction[], filename?: string): void {
    if (transactions.length === 0) return;

    const headers = [
      'Transaction ID',
      'Invoice Ref',
      'Tenant ID',
      'Customer',
      'Amount',
      'Currency',
      'Payment Rail',
      'Status',
      'ZK Verified',
      'Proof Hash',
      'Circuit',
      'Block Number',
      'Fee',
      'Timestamp',
    ];

    const rows = transactions.map((t) => [
      t.id,
      t.invoiceId,
      t.tenantId,
      `"${t.customerName.replace(/"/g, '""')}"`,
      t.amount.toFixed(2),
      t.currency,
      t.settlementRail || t.paymentMethod,
      t.status,
      t.zkVerified ? 'YES' : 'NO',
      t.proofHash || 'N/A',
      `"${t.circuitName || 'N/A'}"`,
      t.blockNumber || 'N/A',
      (t.fee || 0).toFixed(2),
      t.timestamp,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      filename || `ledgerguard_transactions_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
