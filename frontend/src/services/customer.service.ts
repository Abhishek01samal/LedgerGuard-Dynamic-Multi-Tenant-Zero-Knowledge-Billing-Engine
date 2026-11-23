import type { Customer, Invoice } from '../types';
import { INITIAL_CUSTOMERS } from './mockData';
import { invoiceService } from './invoice.service';

let customersStore: Customer[] = [...INITIAL_CUSTOMERS];

export interface CreateCustomerDTO {
  name: string;
  company: string;
  email: string;
  phone?: string;
  address?: string;
  notes?: string;
  status?: 'active' | 'inactive';
}

export const customerService = {
  /**
   * Retrieves all customers filtered by tenant and optional search query
   */
  async getCustomers(tenantId?: string, search?: string): Promise<Customer[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));

    return customersStore.filter((c) => {
      const matchesTenant = !tenantId || c.tenantId === tenantId;
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.company.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search));
      return matchesTenant && matchesSearch;
    });
  },

  /**
   * Retrieves single customer by ID
   */
  async getCustomerById(id: string): Promise<Customer | null> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return customersStore.find((c) => c.id === id) || null;
  },

  /**
   * Registers a new customer into the isolated tenant directory
   */
  async createCustomer(tenantId: string, dto: CreateCustomerDTO): Promise<Customer> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const newCustomer: Customer = {
      id: `cust-${Date.now().toString().slice(-4)}`,
      tenantId,
      name: dto.name,
      company: dto.company,
      email: dto.email,
      phone: dto.phone || '',
      address: dto.address || 'San Francisco, CA, USA',
      notes: dto.notes || '',
      totalBilled: 0,
      status: dto.status || 'active',
      createdAt: new Date().toISOString().split('T')[0],
    };

    customersStore = [newCustomer, ...customersStore];
    return newCustomer;
  },

  /**
   * Toggles customer status between active and inactive
   */
  async updateCustomerStatus(id: string, status: 'active' | 'inactive'): Promise<Customer> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const index = customersStore.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Customer not found');

    customersStore[index] = { ...customersStore[index], status };
    return customersStore[index];
  },

  /**
   * Retrieves all invoices associated with a specific customer
   */
  async getCustomerInvoices(customerId: string): Promise<Invoice[]> {
    const allInvoices = await invoiceService.getInvoices();
    const cust = customersStore.find((c) => c.id === customerId);

    return allInvoices.filter((inv) => {
      if (inv.customerId && inv.customerId === customerId) return true;
      if (cust && (inv.customerName === cust.company || inv.customerName === cust.name)) return true;
      return false;
    });
  },

  /**
   * Deletes a customer account
   */
  async deleteCustomer(id: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    customersStore = customersStore.filter((c) => c.id !== id);
  },
};
