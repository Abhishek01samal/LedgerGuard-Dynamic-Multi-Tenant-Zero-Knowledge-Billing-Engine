import type { IdempotencyGuard } from './ledger.types';

/**
 * DEV / FALLBACK guard: serialises work per key inside ONE Node process.
 * It is NOT distributed. Person 2's Redis guard replaces it with:
 *     setIdempotencyGuard(redisGuard);   // e.g. in server.ts after Redis connects
 * Financial correctness never relies on this: the MongoDB unique index
 * on { tenantId, eventId } is the authoritative duplicate protection.
 */
export class InMemoryIdempotencyGuard implements IdempotencyGuard {
  private readonly tails = new Map<string, Promise<void>>();

  async runExclusive<T>(lockKey: string, work: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(lockKey) ?? Promise.resolve();
    let release!: () => void;
    const mine = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => mine);
    this.tails.set(lockKey, tail);

    await previous;
    try {
      return await work();
    } finally {
      release();
      if (this.tails.get(lockKey) === tail) this.tails.delete(lockKey);
    }
  }
}

let current: IdempotencyGuard = new InMemoryIdempotencyGuard();

export function getIdempotencyGuard(): IdempotencyGuard {
  return current;
}

/** Called once at startup by Person 2's wiring (Redis-backed guard). */
export function setIdempotencyGuard(guard: IdempotencyGuard): void {
  current = guard;
}
