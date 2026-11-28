import { expenditurePipeline, summaryPipeline, usagePipeline } from '../modules/analytics/analytics.aggregation';

const range = {
  from: new Date('2026-11-01T00:00:00.000Z'),
  to: new Date('2026-12-01T00:00:00.000Z'),
};

describe('analytics aggregation pipelines', () => {
  it('scopes by tenant and UTC date range', () => {
    const pipeline = summaryPipeline('company_A', range, 'INR');
    const match = pipeline[0] as { $match: Record<string, unknown> };
    expect(match.$match.tenantId).toBe('company_A');
    expect(match.$match.createdAt).toEqual({ $gte: range.from, $lt: range.to });
  });

  it('counts expenditure only for completed rows of one currency', () => {
    const pipeline = summaryPipeline('company_A', range, 'INR');
    const group = pipeline[1] as { $group: { expenditure: { $sum: { $cond: unknown[] } } } };
    expect(JSON.stringify(group.$group.expenditure)).toContain('COMPLETED');
    expect(JSON.stringify(group.$group.expenditure)).toContain('INR');
  });

  it('groups expenditure by month in UTC', () => {
    const pipeline = expenditurePipeline('company_A', range, 'monthly', 'INR');
    const group = pipeline[1] as { $group: { _id: { $dateTrunc: { timezone: string; unit: string } } } };
    expect(group.$group._id.$dateTrunc.timezone).toBe('UTC');
    expect(group.$group._id.$dateTrunc.unit).toBe('month');
  });

  it('builds usage buckets without mixing tenants', () => {
    const pipeline = usagePipeline('company_B', range, 'daily');
    const match = pipeline[0] as { $match: { tenantId: string } };
    expect(match.$match.tenantId).toBe('company_B');
  });
});
