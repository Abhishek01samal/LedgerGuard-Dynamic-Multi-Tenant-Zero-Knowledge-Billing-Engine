import '../../ledger/test-support/test-env';
import type { Connection, Model } from 'mongoose';
import { Schema } from 'mongoose';
import { describeDb, dropAndClose, openTestConnection } from '../../ledger/test-support/test-db';
import { isDuplicateKeyError, runInTransaction } from '../transaction.service';

interface AccountAttrs {
  name: string;
  balance: number;
}

describeDb('runInTransaction (needs a MongoDB replica set)', () => {
  let connection: Connection;
  let Account: Model<AccountAttrs>;

  beforeAll(async () => {
    connection = await openTestConnection('tx');
    Account = connection.model<AccountAttrs>(
      'Account',
      new Schema<AccountAttrs>({ name: { type: String, unique: true }, balance: Number }, { versionKey: false }),
    );
    await Account.init();
  }, 20_000);

  afterAll(() => dropAndClose(connection));
  beforeEach(() => Account.deleteMany({}));

  it('commits all writes when work succeeds', async () => {
    await runInTransaction(connection, async (session) => {
      await Account.create([{ name: 'a', balance: 1 }], { session });
      await Account.create([{ name: 'b', balance: 2 }], { session });
    });
    expect(await Account.countDocuments()).toBe(2);
  });

  it('rolls back ALL writes when work throws midway', async () => {
    await expect(
      runInTransaction(connection, async (session) => {
        await Account.create([{ name: 'a', balance: 1 }], { session });
        await Account.create([{ name: 'b', balance: 2 }], { session });
        throw new Error('simulated failure');
      }),
    ).rejects.toThrow('simulated failure');
    expect(await Account.countDocuments()).toBe(0);
  });

  it('writes are invisible outside the transaction until commit', async () => {
    let seenOutside = -1;
    await runInTransaction(connection, async (session) => {
      await Account.create([{ name: 'a', balance: 1 }], { session });
      seenOutside = await Account.countDocuments(); // no session => outside the txn
    });
    expect(seenOutside).toBe(0);
    expect(await Account.countDocuments()).toBe(1);
  });

  it('surfaces duplicate-key errors in a way isDuplicateKeyError recognises, and rolls back', async () => {
    await Account.create({ name: 'dup', balance: 1 });
    let caught: unknown;
    try {
      await runInTransaction(connection, async (session) => {
        await Account.create([{ name: 'other', balance: 1 }], { session });
        await Account.create([{ name: 'dup', balance: 1 }], { session });
      });
    } catch (err) {
      caught = err;
    }
    expect(isDuplicateKeyError(caught)).toBe(true);
    expect(await Account.countDocuments({ name: 'other' })).toBe(0);
  });
});

describe('isDuplicateKeyError', () => {
  it('only matches code 11000', () => {
    expect(isDuplicateKeyError({ code: 11000 })).toBe(true);
    expect(isDuplicateKeyError({ code: 1 })).toBe(false);
    expect(isDuplicateKeyError(null)).toBe(false);
    expect(isDuplicateKeyError(new Error('x'))).toBe(false);
  });
});
