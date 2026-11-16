import {
  escapeRegex,
  fromMinorUnits,
  generateTransactionId,
  hashPayload,
  normalizePayload,
  toMinorUnits,
  toTransactionView,
} from '../ledger.mapper';
import type { CreateTransactionInput, LedgerTransactionDoc } from '../ledger.types';

const input: CreateTransactionInput = {
  eventId: 'evt_companyA_001',
  description: 'Monthly subscription payment',
  amount: 1000,
  currency: 'INR',
  debitAccount: 'customer_001',
  creditAccount: 'merchant_001',
};

describe('money conversion', () => {
  it.each([
    [1000, 100000],
    [10.1, 1010],
    [0.07, 7],
    [19.99, 1999],
    [1.15, 115],
  ])('%p -> %p minor units (no float drift)', (major, minor) => {
    expect(toMinorUnits(major)).toBe(minor);
    expect(Number.isInteger(toMinorUnits(major))).toBe(true);
    expect(fromMinorUnits(minor)).toBe(major);
  });
});

describe('payload hashing', () => {
  it('is stable for equal requests, including float-equivalent amounts', () => {
    expect(hashPayload(normalizePayload(input))).toBe(hashPayload(normalizePayload({ ...input })));
    expect(hashPayload(normalizePayload({ ...input, amount: 10.1 }))).toBe(
      hashPayload(normalizePayload({ ...input, amount: 10.1 })),
    );
  });

  it.each([
    ['amount', { amount: 1001 }],
    ['currency', { currency: 'USD' as const }],
    ['debit', { debitAccount: 'customer_002' }],
    ['credit', { creditAccount: 'merchant_002' }],
    ['description', { description: 'other' }],
  ])('changes when %s changes', (_n, patch) => {
    expect(hashPayload(normalizePayload({ ...input, ...patch }))).not.toBe(hashPayload(normalizePayload(input)));
  });
});

describe('helpers', () => {
  it('generates unique txn ids matching the route param pattern', () => {
    const a = generateTransactionId();
    expect(a).toMatch(/^txn_[A-Za-z0-9-]{3,64}$/);
    expect(a).not.toBe(generateTransactionId());
  });

  it('escapes regex metacharacters', () => {
    expect(new RegExp(escapeRegex('a.b*c(d)')).test('a.b*c(d)')).toBe(true);
    expect(new RegExp(escapeRegex('a.b')).test('axb')).toBe(false);
  });

  it('maps a document to the API view', () => {
    const now = new Date('2026-01-01T10:00:00.000Z');
    const doc: LedgerTransactionDoc = {
      tenantId: 'company_A',
      transactionId: 'txn_001',
      eventId: 'evt_companyA_001',
      payloadHash: 'h',
      status: 'COMPLETED',
      amountMinor: 100000,
      currency: 'INR',
      description: 'd',
      debitAccount: 'a',
      creditAccount: 'b',
      attempts: 1,
      createdBy: 'user_001',
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    expect(toTransactionView(doc)).toMatchObject({
      transactionId: 'txn_001',
      amount: 1000,
      failureReason: null,
      completedAt: now.toISOString(),
    });
    expect(JSON.stringify(toTransactionView(doc))).not.toContain('tenantId');
    expect(JSON.stringify(toTransactionView(doc))).not.toContain('payloadHash');
  });
});
