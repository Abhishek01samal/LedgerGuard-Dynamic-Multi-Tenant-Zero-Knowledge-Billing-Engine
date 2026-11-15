import { randomBytes } from 'node:crypto';
import mongoose, { type Connection } from 'mongoose';

/**
 * Transactions need a replica set. Point MONGO_TEST_URI at one, e.g.
 *   MONGO_TEST_URI="mongodb://127.0.0.1:27017/?replicaSet=rs0"
 * DB-backed suites are skipped (not failed) when it is not set.
 */
export const MONGO_TEST_URI = process.env.MONGO_TEST_URI;
export const describeDb: jest.Describe = MONGO_TEST_URI ? describe : describe.skip;

export async function openTestConnection(label: string): Promise<Connection> {
  if (!MONGO_TEST_URI) throw new Error('MONGO_TEST_URI is not set');
  const dbName = `lg_test_${label}_${randomBytes(4).toString('hex')}`;
  return mongoose.createConnection(MONGO_TEST_URI, { dbName, serverSelectionTimeoutMS: 5000 }).asPromise();
}

export async function dropAndClose(...connections: (Connection | undefined)[]): Promise<void> {
  for (const connection of connections) {
    if (!connection) continue;
    await connection.dropDatabase();
    await connection.close();
  }
}
