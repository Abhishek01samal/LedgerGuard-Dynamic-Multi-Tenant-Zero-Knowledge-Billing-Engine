import { setIdempotencyGuard } from '../modules/ledger/ledger.guard';
import { RedisIdempotencyGuard } from './lock.service';

/** Use Redis locks when connected; the guard falls back in-process until then. */
export function registerIdempotencyGuard(): void {
  setIdempotencyGuard(new RedisIdempotencyGuard());
}
