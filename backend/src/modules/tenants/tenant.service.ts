import type { TenantConfig } from "./tenant.types";

const tenants: TenantConfig[] = [
  {
    tenantId: "company_A",
    databaseName: "ledgerguard_company_a",
    status: "active",
  },
  {
    tenantId: "company_B",
    databaseName: "ledgerguard_company_b",
    status: "active",
  },
];

export function getTenantById(
  tenantId: string
): TenantConfig | undefined {
  return tenants.find(
    (tenant) => tenant.tenantId === tenantId
  );
}