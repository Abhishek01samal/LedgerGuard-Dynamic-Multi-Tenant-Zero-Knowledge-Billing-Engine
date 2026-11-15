import type { Tenant } from '../types';
import { INITIAL_TENANTS } from './mockData';

let activeTenantId = INITIAL_TENANTS[0].id;

export const tenantService = {
  async getTenants(): Promise<Tenant[]> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return [...INITIAL_TENANTS];
  },

  async getActiveTenant(): Promise<Tenant> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return INITIAL_TENANTS.find((t) => t.id === activeTenantId) || INITIAL_TENANTS[0];
  },

  setActiveTenant(id: string): void {
    activeTenantId = id;
  },
};
