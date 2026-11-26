import { invoiceService } from './invoice.service';
import { customerService } from './customer.service';
import { transactionService } from './transaction.service';
import type { Invoice, Customer, Transaction } from '../types';

export type SearchCategory = 'invoice' | 'customer' | 'transaction' | 'action';

export interface SearchResultItem {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle: string;
  metadata?: string;
  badge?: {
    label: string;
    variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'zk';
  };
  actionType: 'navigate_tab' | 'open_invoice' | 'open_customer' | 'open_transaction' | 'trigger_action';
  targetTab?: string;
  payload?: Invoice | Customer | Transaction | string;
}

export interface GlobalSearchResults {
  invoices: SearchResultItem[];
  customers: SearchResultItem[];
  transactions: SearchResultItem[];
  actions: SearchResultItem[];
  totalMatches: number;
}

const STATIC_ACTIONS: SearchResultItem[] = [
  {
    id: 'cmd-create-invoice',
    category: 'action',
    title: 'Create New Invoice',
    subtitle: 'Generate cryptographic ZK billing statement with multi-line items',
    metadata: 'Command',
    actionType: 'trigger_action',
    payload: 'create_invoice',
  },
  {
    id: 'cmd-add-customer',
    category: 'action',
    title: 'Register Enterprise Customer',
    subtitle: 'Add new client organization to current isolated tenant partition',
    metadata: 'Command',
    actionType: 'trigger_action',
    payload: 'add_customer',
  },
  {
    id: 'cmd-nav-ledger',
    category: 'action',
    title: 'View Immutable ZK Ledger',
    subtitle: 'Inspect settlement receipts, proof commitments, and block sequences',
    metadata: 'Navigation',
    actionType: 'navigate_tab',
    targetTab: 'transactions',
  },
  {
    id: 'cmd-nav-subscriptions',
    category: 'action',
    title: 'Subscription Tiers & Proof Quotas',
    subtitle: 'Manage engine tier, annual billing discounts, and compute limits',
    metadata: 'Navigation',
    actionType: 'navigate_tab',
    targetTab: 'subscriptions',
  },
  {
    id: 'cmd-nav-security',
    category: 'action',
    title: 'Zero-Knowledge Security Verifier',
    subtitle: 'Verify Groth16 / BN254 circuit pairing proofs and audit trail',
    metadata: 'Navigation',
    actionType: 'navigate_tab',
    targetTab: 'security',
  },
  {
    id: 'cmd-nav-settings',
    category: 'action',
    title: 'Console Settings & Database Config',
    subtitle: 'Review tenant partition storage parameters and settlement preferences',
    metadata: 'Navigation',
    actionType: 'navigate_tab',
    targetTab: 'settings',
  },
];

export const searchService = {
  async searchGlobal(tenantId?: string, query: string = ''): Promise<GlobalSearchResults> {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) {
      return {
        invoices: [],
        customers: [],
        transactions: [],
        actions: STATIC_ACTIONS.slice(0, 4),
        totalMatches: 4,
      };
    }

    // Parallel fetch across data services
    const [invoices, customers, transactions] = await Promise.all([
      invoiceService.getInvoices('all'),
      customerService.getCustomers(tenantId),
      transactionService.getTransactions(tenantId),
    ]);

    // Filter Invoices
    const matchingInvoices: SearchResultItem[] = invoices
      .filter((inv) => {
        const matchesTenant = !tenantId || inv.tenantId === tenantId;
        return (
          matchesTenant &&
          (inv.invoiceNumber.toLowerCase().includes(cleanQuery) ||
            inv.customerName.toLowerCase().includes(cleanQuery) ||
            inv.customerEmail.toLowerCase().includes(cleanQuery) ||
            inv.total.toString().includes(cleanQuery) ||
            inv.status.toLowerCase().includes(cleanQuery))
        );
      })
      .slice(0, 5)
      .map((inv) => ({
        id: inv.id,
        category: 'invoice',
        title: `${inv.invoiceNumber} – ${inv.customerName}`,
        subtitle: `Total: $${inv.total.toLocaleString()} • Due: ${inv.dueDate}`,
        metadata: inv.status.toUpperCase(),
        badge: {
          label: inv.status,
          variant:
            inv.status === 'paid'
              ? 'success'
              : inv.status === 'pending'
              ? 'warning'
              : inv.status === 'overdue'
              ? 'danger'
              : 'neutral',
        },
        actionType: 'open_invoice',
        targetTab: 'invoices',
        payload: inv,
      }));

    // Filter Customers
    const matchingCustomers: SearchResultItem[] = customers
      .filter((cust) => {
        return (
          cust.company.toLowerCase().includes(cleanQuery) ||
          cust.name.toLowerCase().includes(cleanQuery) ||
          cust.email.toLowerCase().includes(cleanQuery) ||
          (cust.phone && cust.phone.toLowerCase().includes(cleanQuery))
        );
      })
      .slice(0, 5)
      .map((cust) => ({
        id: cust.id,
        category: 'customer',
        title: cust.company,
        subtitle: `${cust.name} • ${cust.email}`,
        metadata: `$${cust.totalBilled.toLocaleString()} billed`,
        badge: {
          label: cust.status,
          variant: cust.status === 'active' ? 'success' : 'neutral',
        },
        actionType: 'open_customer',
        targetTab: 'customers',
        payload: cust,
      }));

    // Filter Transactions
    const matchingTransactions: SearchResultItem[] = transactions
      .filter((tx) => {
        return (
          tx.id.toLowerCase().includes(cleanQuery) ||
          tx.invoiceId.toLowerCase().includes(cleanQuery) ||
          tx.customerName.toLowerCase().includes(cleanQuery) ||
          (tx.proofHash && tx.proofHash.toLowerCase().includes(cleanQuery)) ||
          tx.paymentMethod.toLowerCase().includes(cleanQuery)
        );
      })
      .slice(0, 5)
      .map((tx) => ({
        id: tx.id,
        category: 'transaction',
        title: `${tx.id} (${tx.paymentMethod})`,
        subtitle: `Ref: ${tx.invoiceId} • Customer: ${tx.customerName} • $${tx.amount.toLocaleString()}`,
        metadata: tx.zkVerified ? 'ZK-SEALED' : 'UNVERIFIED',
        badge: {
          label: tx.status,
          variant:
            tx.status === 'succeeded'
              ? 'success'
              : tx.status === 'pending'
              ? 'warning'
              : 'danger',
        },
        actionType: 'open_transaction',
        targetTab: 'transactions',
        payload: tx,
      }));

    // Filter Action Commands
    const matchingActions: SearchResultItem[] = STATIC_ACTIONS.filter(
      (act) =>
        act.title.toLowerCase().includes(cleanQuery) ||
        act.subtitle.toLowerCase().includes(cleanQuery)
    );

    const totalMatches =
      matchingInvoices.length +
      matchingCustomers.length +
      matchingTransactions.length +
      matchingActions.length;

    return {
      invoices: matchingInvoices,
      customers: matchingCustomers,
      transactions: matchingTransactions,
      actions: matchingActions,
      totalMatches,
    };
  },
};
