import type { Tenant } from '../types';
import { INITIAL_TENANTS } from './mockData';

let tenantsStore = [...INITIAL_TENANTS];
let activeTenantId = INITIAL_TENANTS[0].id;

export const tenantService = {
  async getTenants(): Promise<Tenant[]> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return [...tenantsStore];
  },

  async getActiveTenant(): Promise<Tenant> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return tenantsStore.find((t) => t.id === activeTenantId) || tenantsStore[0];
  },

  setActiveTenant(id: string): void {
    activeTenantId = id;
  },

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const idx = tenantsStore.findIndex((t) => t.id === id);
    if (idx !== -1) {
      tenantsStore[idx] = { ...tenantsStore[idx], ...updates };
      return tenantsStore[idx];
    }
    throw new Error(`Tenant ${id} not found.`);
  },
};
