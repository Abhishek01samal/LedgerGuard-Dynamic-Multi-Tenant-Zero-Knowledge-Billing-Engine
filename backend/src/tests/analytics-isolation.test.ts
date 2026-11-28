import type { Connection } from 'mongoose';
import { getLedgerModels } from '../modules/ledger/ledger.model';
import { getSummary } from '../modules/analytics/analytics.service';
import { describeDb, dropAndClose, openTestConnection } from '../modules/ledger/test-support/test-db';
import { sampleTransactions } from './fixtures/analytics-data';

describeDb('analytics tenant isolation (needs Mongo replica set)', () => {
  let connA: Connection;
  let connB: Connection;

  beforeAll(async () => {
    connA = await openTestConnection('analytics_a');
    connB = await openTestConnection('analytics_b');
  }, 20_000);

  afterAll(() => dropAndClose(connA, connB));

  it('never includes another tenant expenditure', async () => {
    const modelsA = getLedgerModels(connA);
    await modelsA.Transaction.init();
    await modelsA.Transaction.insertMany(sampleTransactions);

    const modelsB = getLedgerModels(connB);
    await modelsB.Transaction.init();
    await modelsB.Transaction.insertMany(
      sampleTransactions.map((row) => ({
        ...row,
        tenantId: 'company_B',
        transactionId: row.transactionId.replace('a', 'b'),
        eventId: row.eventId.replace('a', 'b'),
        amountMinor: 9_999_999,
      })),
    );

    const summary = await getSummary(connA, 'company_A', {
      currency: 'INR',
      from: '2026-11-01',
      to: '2026-11-30',
    });

    expect(summary.totalExpenditure).toBe(100000);
    expect(summary.successfulTransactions).toBe(2);
    expect(summary.failedTransactions).toBe(1);
  });
});
