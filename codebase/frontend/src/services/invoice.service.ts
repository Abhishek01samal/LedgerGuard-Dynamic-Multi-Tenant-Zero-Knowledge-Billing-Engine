import type { Invoice, InvoiceStatus } from '../types';
import { INITIAL_INVOICES } from './mockData';

// In-memory store for reactive client state during mock mode
let invoicesStore: Invoice[] = [...INITIAL_INVOICES];

export interface CreateInvoiceDTO {
  customerName: string;
  customerEmail: string;
  description: string;
  amount: number;
  dueDate: string;
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
   * Generates a new invoice with initial ZK proof simulation.
   */
  async createInvoice(tenantId: string, dto: CreateInvoiceDTO): Promise<Invoice> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const invoiceCount = invoicesStore.length + 1;
    const invoiceNumber = `INV-2026-00${invoiceCount}`;

    const newInvoice: Invoice = {
      id: invoiceNumber,
      invoiceNumber,
      tenantId,
      customerId: `cust-${Date.now().toString().slice(-4)}`,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      items: [
        {
          id: `item-${Date.now()}`,
          description: dto.description,
          quantity: 1,
          unitPrice: dto.amount,
          amount: dto.amount,
        },
      ],
      subtotal: dto.amount,
      tax: 0,
      total: dto.amount,
      currency: 'USD',
      status: 'pending',
      zkProofStatus: 'verified',
      zkProofHash: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      dueDate: dto.dueDate,
      createdAt: new Date().toISOString().split('T')[0],
    };

    invoicesStore = [newInvoice, ...invoicesStore];
    return newInvoice;
  },
};
