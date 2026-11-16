import mongoose from 'mongoose';
import { isRecord } from '../../../../shared/contracts/common.contract';

/** Default points at the single-node replica set from docker-compose.yml. */
export const DEFAULT_TEST_MONGO_URI =
  'mongodb://127.0.0.1:27017/ledgerguard_test_master?replicaSet=rs0';

export function getTestMongoUri(): string {
  return process.env.TEST_MONGO_URI ?? DEFAULT_TEST_MONGO_URI;
}

export interface ReplicaSetInfo {
  setName: string | null;
  isWritablePrimary: boolean;
}

/** Ask the server what it is. Resolves quickly or throws when MongoDB is down. */
export async function inspectReplicaSet(uri: string = getTestMongoUri()): Promise<ReplicaSetInfo> {
  const connection = await mongoose
    .createConnection(uri, { serverSelectionTimeoutMS: 4000 })
    .asPromise();
  try {
    const hello: unknown = await connection.getClient().db('admin').command({ hello: 1 });
    if (!isRecord(hello)) throw new Error('Unexpected reply to MongoDB "hello" command');
    return {
      setName: typeof hello.setName === 'string' ? hello.setName : null,
      isWritablePrimary: hello.isWritablePrimary === true,
    };
  } finally {
    await connection.close();
  }
}

/**
 * Fail fast, with a fix, when the test database cannot run multi-document transactions.
 * A standalone mongod is not enough: it must be a replica set with a primary.
 */
export async function assertReplicaSet(uri: string = getTestMongoUri()): Promise<ReplicaSetInfo> {
  let info: ReplicaSetInfo;
  try {
    info = await inspectReplicaSet(uri);
  } catch (err) {
    throw new Error(
      `Cannot reach MongoDB at ${redactUri(uri)}. Start it with "docker compose up -d --wait" ` +
        `from the repo root. (${err instanceof Error ? err.message : String(err)})`,
    );
  }
  if (!info.setName || !info.isWritablePrimary) {
    throw new Error(
      'MongoDB is running but is not a replica set primary, so transactions are impossible. ' +
        'Use the docker-compose.yml service (it initiates rs0) or run mongod with --replSet.',
    );
  }
  return info;
}

/**
 * Run `work` against a throw-away database. The database is dropped afterwards, so infra tests
 * (transactions, rollback) never touch tenant data.
 */
export async function withScratchDatabase<T>(
  work: (connection: mongoose.Connection) => Promise<T>,
): Promise<T> {
  const connection = await mongoose
    .createConnection(getTestMongoUri(), {
      dbName: `ledgerguard_test_scratch_${process.pid}_${Date.now()}`,
      serverSelectionTimeoutMS: 4000,
    })
    .asPromise();
  try {
    return await work(connection);
  } finally {
    await connection.dropDatabase();
    await connection.close();
  }
}

/** Never print credentials from a connection string. */
export function redactUri(uri: string): string {
  return uri.replace(/\/\/[^@/]*@/, '//***@');
}
