/**
 * PLACEHOLDER - OWNED BY PERSON 2 (Week 1). DO NOT COMMIT THIS FILE.
 * Your repo already has the real one after Person 2's Week 1 PR is merged.
 * Person 1's code relies only on this signature:
 *   getTenantConnection(tenantId: string): Promise<Connection>
 */
import mongoose, { type Connection } from 'mongoose';
import { env } from '../config/env';

let base: Connection | null = null;

export async function getTenantConnection(tenantId: string): Promise<Connection> {
  base ??= await mongoose.createConnection(env.mongoMasterUri).asPromise();
  return base.useDb(`tenant_${tenantId}`, { useCache: true });
}
