import type { Invoice, InvoiceStatus } from '../types';
import { INITIAL_INVOICES } from './mockData';

// In-memory store for reactive client state during mock mode
let invoicesStore: Invoice[] = [...INITIAL_INVOICES];

export interface CreateInvoiceDTO {
  customerName: string;
  customerEmail: string;
  customerId?: string;
  description?: string;
  amount?: number;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal?: number;
  tax?: number;
  total?: number;
  currency?: string;
  dueDate: string;
  notes?: string;
}

export const invoiceService = {
  /**
   * Retrieves all invoices for the current tenant.
   * Easily replaceable with `axios.get('/api/v1/invoices')` once backend server is active.
   */
  async getInvoices(statusFilter?: InvoiceStatus | 'all', search?: string): Promise<Invoice[]> {
    // Simulate brief network latency
    await new Promise((resolve) => setTimeout(resolve, 150));

    return invoicesStore.filter((inv) => {
      const matchesStatus = !statusFilter || statusFilter === 'all' || inv.status === statusFilter;
      const matchesSearch =
        !search ||
        inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  },

  /**
   * Generates a new invoice with initial ZK proof simulation and multi-line item calculations.
   */
  async createInvoice(tenantId: string, dto: CreateInvoiceDTO): Promise<Invoice> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const invoiceCount = invoicesStore.length + 1;
    const invoiceNumber = `INV-2026-00${invoiceCount}`;

    // Normalize line items
    const lineItems =
      dto.items && dto.items.length > 0
        ? dto.items.map((item, idx) => ({
            id: `item-${idx}-${Date.now()}`,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
          }))
        : [
            {
              id: `item-${Date.now()}`,
              description: dto.description || 'Professional Billing Services',
              quantity: 1,
              unitPrice: dto.amount || 0,
              amount: dto.amount || 0,
            },
          ];

    const computedSubtotal =
      dto.subtotal ?? lineItems.reduce((acc, item) => acc + item.amount, 0);
    const computedTax = dto.tax ?? Math.round(computedSubtotal * 0.085);
    const computedTotal = dto.total ?? computedSubtotal + computedTax;

    const newInvoice: Invoice = {
      id: invoiceNumber,
      invoiceNumber,
      tenantId,
      customerId: dto.customerId || `cust-${Date.now().toString().slice(-4)}`,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      items: lineItems,
      subtotal: computedSubtotal,
      tax: computedTax,
      total: computedTotal,
      currency: dto.currency || 'USD',
      status: 'pending',
      zkProofStatus: 'verified',
      zkProofHash: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      dueDate: dto.dueDate,
      createdAt: new Date().toISOString().split('T')[0],
    };

    invoicesStore = [newInvoice, ...invoicesStore];
    return newInvoice;
  },

  /**
   * Updates an invoice's status (e.g. marking as paid, overdue, etc.)
   */
  async updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const invIndex = invoicesStore.findIndex((i) => i.id === id);
    if (invIndex === -1) throw new Error('Invoice not found');

    const updated = {
      ...invoicesStore[invIndex],
      status,
      // If paid, ensure ZK proof is verified
      zkProofStatus: (status === 'paid' ? 'verified' : invoicesStore[invIndex].zkProofStatus) as 'verified' | 'pending' | 'unverified',
    };
    invoicesStore[invIndex] = updated;
    return updated;
  },

  /**
   * Batch updates status across multiple invoices
   */
  async batchUpdateStatus(ids: string[], status: InvoiceStatus): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    invoicesStore = invoicesStore.map((inv) =>
      ids.includes(inv.id) ? { ...inv, status, zkProofStatus: status === 'paid' ? 'verified' : inv.zkProofStatus } : inv
    );
  },

  /**
   * Retrieves single invoice by ID
   */
  async getInvoiceById(id: string): Promise<Invoice | null> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return invoicesStore.find((i) => i.id === id) || null;
  },

  /**
   * Deletes an invoice
   */
  async deleteInvoice(id: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    invoicesStore = invoicesStore.filter((i) => i.id !== id);
  },

  /**
   * Batch deletes invoices
   */
  async batchDelete(ids: string[]): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    invoicesStore = invoicesStore.filter((i) => !ids.includes(i.id));
  },
};
