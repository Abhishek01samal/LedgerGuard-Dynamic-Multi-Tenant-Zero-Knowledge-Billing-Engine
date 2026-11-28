import { resolveDateRange, resolveYearRange, summaryQuerySchema } from '../modules/analytics/analytics.validation';

describe('analytics validation', () => {
  it('defaults currency to INR and ignores tenantId query keys', () => {
    const parsed = summaryQuerySchema.parse({ tenantId: 'company_B', from: '2026-11-01', to: '2026-11-30' });
    expect(parsed.currency).toBe('INR');
    expect('tenantId' in parsed).toBe(false);
  });

  it('rejects inverted ranges', () => {
    const result = summaryQuerySchema.safeParse({ from: '2026-11-30', to: '2026-11-01' });
    expect(result.success).toBe(false);
  });

  it('builds an exclusive UTC end date', () => {
    const range = resolveDateRange('2026-11-01', '2026-11-01');
    expect(range.from.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(range.to.toISOString()).toBe('2026-11-02T00:00:00.000Z');
  });

  it('covers a full UTC year', () => {
    const range = resolveYearRange(2026);
    expect(range.from.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(range.to.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});
