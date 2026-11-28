import mongoose, { type Connection } from 'mongoose';
import { env } from '../config/env';

let base: Connection | null = null;

export async function getTenantConnection(tenantId: string): Promise<Connection> {
  const safeId = tenantId.replace(/[^A-Za-z0-9_-]/g, '_');
  base ??= await mongoose.createConnection(env.mongoMasterUri).asPromise();
  return base.useDb(`tenant_${safeId}`, { useCache: true });
}

export async function closeAllTenantConnections(): Promise<void> {
  if (!base) return;
  await base.close();
  base = null;
}
