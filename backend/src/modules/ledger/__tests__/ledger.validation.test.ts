import {
  createTransactionSchema,
  idempotencyKeySchema,
  listQuerySchema,
  summaryQuerySchema,
  transactionIdParamSchema,
} from '../ledger.validation';

const valid = {
  eventId: 'evt_companyA_001',
  description: 'Monthly subscription payment',
  amount: 1000,
  currency: 'INR',
  debitAccount: 'customer_001',
  creditAccount: 'merchant_001',
};

describe('createTransactionSchema', () => {
  it('accepts the frozen contract example', () => {
    expect(createTransactionSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    ['zero amount', { amount: 0 }],
    ['negative amount', { amount: -5 }],
    ['3 decimals', { amount: 10.123 }],
    ['string amount', { amount: '1000' }],
    ['NaN amount', { amount: Number.NaN }],
    ['huge amount', { amount: 5_000_000_000 }],
    ['unknown currency', { currency: 'XYZ' }],
    ['same accounts', { creditAccount: 'customer_001' }],
    ['bad account chars', { debitAccount: 'cust omer' }],
    ['injection-like account', { debitAccount: { $ne: null } }],
    ['empty description', { description: '   ' }],
    ['short eventId', { eventId: 'ab' }],
    ['unknown field', { tenantId: 'company_B' }],
  ])('rejects %s', (_name, patch) => {
    expect(createTransactionSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });

  it('allows 2-decimal amounts despite float noise', () => {
    expect(createTransactionSchema.safeParse({ ...valid, amount: 10.1 }).success).toBe(true);
    expect(createTransactionSchema.safeParse({ ...valid, amount: 0.07 }).success).toBe(true);
  });
});

describe('other schemas', () => {
  it('idempotency key', () => {
    expect(idempotencyKeySchema.safeParse('evt_companyA_001').success).toBe(true);
    expect(idempotencyKeySchema.safeParse(undefined).success).toBe(false);
    expect(idempotencyKeySchema.safeParse('has space').success).toBe(false);
  });

  it('list query defaults and empty strings', () => {
    expect(listQuerySchema.parse({})).toMatchObject({ page: 1, limit: 10 });
    const q = listQuerySchema.parse({ page: '2', limit: '25', status: '', search: '' });
    expect(q).toMatchObject({ page: 2, limit: 25 });
    expect(q.status).toBeUndefined();
    expect(q.search).toBeUndefined();
  });

  it('list query bounds and bad values', () => {
    expect(listQuerySchema.safeParse({ limit: '1000' }).success).toBe(false);
    expect(listQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(listQuerySchema.safeParse({ status: 'DONE' }).success).toBe(false);
    expect(listQuerySchema.safeParse({ from: '2026-02-01', to: '2026-01-01' }).success).toBe(false);
  });

  it('summary currency defaults to INR', () => {
    expect(summaryQuerySchema.parse({}).currency).toBe('INR');
    expect(summaryQuerySchema.safeParse({ currency: 'ABC' }).success).toBe(false);
  });

  it('transaction id param', () => {
    expect(transactionIdParamSchema.safeParse({ id: 'txn_001' }).success).toBe(true);
    expect(transactionIdParamSchema.safeParse({ id: '../etc' }).success).toBe(false);
  });
});
