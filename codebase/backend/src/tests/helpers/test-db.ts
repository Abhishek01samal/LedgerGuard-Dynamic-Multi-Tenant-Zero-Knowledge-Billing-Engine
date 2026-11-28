// backend/src/tests/helpers/test-db.ts
// In-memory MongoDB (real mongod, so $dateTrunc etc. behave like production). Needs MongoDB 5.0+.
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { type Connection } from 'mongoose';
import type { TxRow } from '../fixtures/analytics-data';

export interface TestDb {
  /** One database per tenant – mirrors the Week 1 tenant connection manager. */
  tenant(name: string): Connection;
  seed(tenantId: string, rows: TxRow[]): Promise<void>;
  close(): Promise<void>;
}

export async function startTestDb(): Promise<TestDb> {
  const server = await MongoMemoryServer.create({
    binary: { version: process.env.MONGOMS_VERSION ?? '7.0.14' },
  });
  const base = await mongoose.createConnection(server.getUri()).asPromise();

  const tenant = (name: string) => base.useDb(`tenant_${name}`, { useCache: true });

  return {
    tenant,
    async seed(tenantId, rows) {
      if (rows.length === 0) return;
      // Insert in chunks so large datasets don't exceed the 16MB batch limit.
      const col = tenant(tenantId).db!.collection('transactions');
      for (let i = 0; i < rows.length; i += 10_000) {
        await col.insertMany(rows.slice(i, i + 10_000) as unknown as Record<string, unknown>[]);
      }
    },
    async close() {
      await base.close();
      await server.stop();
    },
  };
}
