import { AppError } from '../../middleware/error.middleware';

/** Thrown by an IdempotencyGuard when another request holds the lock (retryable). */
export class LockUnavailableError extends Error {
  constructor(message = 'Lock is held by another request') {
    super(message);
    this.name = 'LockUnavailableError';
  }
}

/** Duplicate key reused with a different payload. */
export const idempotencyKeyReused = (): AppError =>
  new AppError(409, 'This idempotency key was already used with a different request payload', 'IDEMPOTENCY_KEY_REUSED');

/** Same event is currently being processed; the client should retry shortly. */
export const transactionInProgress = (): AppError =>
  new AppError(409, 'This transaction is still being processed. Retry shortly with the same Idempotency-Key.', 'TRANSACTION_IN_PROGRESS');

export const idempotencyKeyMismatch = (): AppError =>
  new AppError(400, 'Idempotency-Key header must match eventId in the request body', 'IDEMPOTENCY_KEY_MISMATCH');
