import { assertReplicaSet, withScratchDatabase } from './helpers/test-database';

/**
 * Day 2: proves the TEST DATABASE can do what the ledger needs, before any ledger code runs.
 * If these fail, fix the environment (docker-compose.yml) - not the ledger service.
 */
describe('MongoDB replica set (infrastructure)', () => {
  it('is a replica set with a writable primary', async () => {
    const info = await assertReplicaSet();
    expect(info.setName).toBe('rs0');
    expect(info.isWritablePrimary).toBe(true);
  });

  it('commits a multi-document transaction atomically', async () => {
    await withScratchDatabase(async (connection) => {
      const entries = connection.collection('entries');
      const session = await connection.startSession();
      try {
        await session.withTransaction(async () => {
          await entries.insertOne({ account: 'customer_001', type: 'DEBIT' }, { session });
          await entries.insertOne({ account: 'merchant_001', type: 'CREDIT' }, { session });
        });
      } finally {
        await session.endSession();
      }
      expect(await entries.countDocuments()).toBe(2);
    });
  });

  it('rolls back every write when the transaction aborts', async () => {
    await withScratchDatabase(async (connection) => {
      const entries = connection.collection('entries');
      await entries.insertOne({ account: 'seed', type: 'DEBIT' }); // creates the collection
      const session = await connection.startSession();
      try {
        session.startTransaction();
        await entries.insertOne({ account: 'customer_001', type: 'DEBIT' }, { session });
        await entries.insertOne({ account: 'merchant_001', type: 'CREDIT' }, { session });
        await session.abortTransaction();
      } finally {
        await session.endSession();
      }
      expect(await entries.countDocuments()).toBe(1); // only the seed row survived
    });
  });

  it('rolls back the first write when the second one fails (duplicate key)', async () => {
    await withScratchDatabase(async (connection) => {
      const entries = connection.collection('entries');
      await entries.createIndex({ eventId: 1, side: 1 }, { unique: true });
      await entries.insertOne({ eventId: 'evt_x', side: 'CREDIT' }); // pre-existing credit

      const session = await connection.startSession();
      let failed = false;
      try {
        await session.withTransaction(async () => {
          await entries.insertOne({ eventId: 'evt_x', side: 'DEBIT' }, { session });
          await entries.insertOne({ eventId: 'evt_x', side: 'CREDIT' }, { session }); // duplicate
        });
      } catch {
        failed = true;
      } finally {
        await session.endSession();
      }

      expect(failed).toBe(true);
      expect(await entries.countDocuments({ eventId: 'evt_x' })).toBe(1); // the DEBIT rolled back
    });
  });
});
