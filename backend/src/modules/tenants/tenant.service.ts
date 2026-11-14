import { TenantModel } from "./tenant.model";

export async function createTenant(
  tenantData: Parameters<typeof TenantModel.create>[0]
) {
  const existingTenant = await TenantModel.findOne({
    tenantId: tenantData.tenantId,
  });

  if (existingTenant) {
    throw new Error("Tenant ID already exists");
  }

  return await TenantModel.create(tenantData);
}
export async function getActiveTenantById(tenantId: string) {
  return await TenantModel.findOne({
    tenantId,
    status: "active",
  });
}

export async function updateTenantStatus(
  tenantId: string,
  status: "active" | "inactive"
) {
  return await TenantModel.findOneAndUpdate(
    { tenantId },
    { status },
    { returnDocument: "after", runValidators: true }
  );
}
export async function getAllTenants() {
  return await TenantModel.find().sort({ createdAt: -1 });
}

export async function getTenantById(tenantId: string) {
  return await TenantModel.findOne({ tenantId });
}