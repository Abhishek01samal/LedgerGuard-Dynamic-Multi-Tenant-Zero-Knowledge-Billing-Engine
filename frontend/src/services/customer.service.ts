import type { Customer } from '../types';
import { INITIAL_CUSTOMERS } from './mockData';

let customersStore: Customer[] = [...INITIAL_CUSTOMERS];

export interface CreateCustomerDTO {
  name: string;
  company: string;
  email: string;
  phone?: string;
}

export const customerService = {
  async getCustomers(tenantId?: string, search?: string): Promise<Customer[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));

    return customersStore.filter((c) => {
      const matchesTenant = !tenantId || c.tenantId === tenantId;
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.company.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase());
      return matchesTenant && matchesSearch;
    });
  },

  async createCustomer(tenantId: string, dto: CreateCustomerDTO): Promise<Customer> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const newCustomer: Customer = {
      id: `cust-${Date.now().toString().slice(-4)}`,
      tenantId,
      name: dto.name,
      company: dto.company,
      email: dto.email,
      phone: dto.phone,
      totalBilled: 0,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
    };

    customersStore = [newCustomer, ...customersStore];
    return newCustomer;
  },
};
