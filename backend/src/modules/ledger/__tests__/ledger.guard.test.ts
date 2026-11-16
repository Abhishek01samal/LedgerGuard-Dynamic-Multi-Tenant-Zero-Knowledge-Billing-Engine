import { InMemoryIdempotencyGuard } from '../ledger.guard';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe('InMemoryIdempotencyGuard', () => {
  it('runs same-key work one at a time, in order', async () => {
    const guard = new InMemoryIdempotencyGuard();
    const log: string[] = [];
    const task = (name: string, ms: number) =>
      guard.runExclusive('k', async () => {
        log.push(`start ${name}`);
        await sleep(ms);
        log.push(`end ${name}`);
        return name;
      });
    const results = await Promise.all([task('a', 30), task('b', 5), task('c', 1)]);
    expect(results).toEqual(['a', 'b', 'c']);
    expect(log).toEqual(['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
  });

  it('does not block different keys', async () => {
    const guard = new InMemoryIdempotencyGuard();
    let overlap = 0;
    let maxOverlap = 0;
    const task = (key: string) =>
      guard.runExclusive(key, async () => {
        overlap += 1;
        maxOverlap = Math.max(maxOverlap, overlap);
        await sleep(20);
        overlap -= 1;
      });
    await Promise.all([task('x'), task('y')]);
    expect(maxOverlap).toBe(2);
  });

  it('releases the lock when work throws', async () => {
    const guard = new InMemoryIdempotencyGuard();
    await expect(guard.runExclusive('k', () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(guard.runExclusive('k', () => Promise.resolve('ok'))).resolves.toBe('ok');
  });
});
