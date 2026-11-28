import {
  remainingMinor,
  usagePercentage,
  utcMonthRange,
} from '../services/usage-calculation.service';

describe('usage calculations', () => {
  it('never returns a negative remaining limit', () => {
    expect(remainingMinor(500000, 250000)).toBe(250000);
    expect(remainingMinor(500000, 900000)).toBe(0);
  });

  it('computes percentage to two decimals', () => {
    expect(usagePercentage(500000, 250000)).toBe(50);
    expect(usagePercentage(500000, 1)).toBe(0);
    expect(usagePercentage(0, 10)).toBe(0);
  });

  it('uses UTC month boundaries', () => {
    const { from, to } = utcMonthRange(new Date('2026-11-28T10:30:00.000Z'));
    expect(from.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(to.toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });
});
