import { createHash, createSign, createVerify } from 'node:crypto';
import { getRedis } from '../../config/redis';
import { env } from '../../config/env';
import { securityConfig } from '../../config/security.config';
import { AppError } from '../../middleware/error.middleware';
import { redisSetNxEx } from '../../services/redis.service';
import type { CanonicalRequest, TransactionReceipt } from './security.types';

const usedNonces = new Map<string, number>();

export function hashBody(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function canonicalString(input: CanonicalRequest): string {
  return [input.method.toUpperCase(), input.path, input.timestamp, input.nonce, input.bodyHash].join('\n');
}

export function generateSignature(payload: string, privateKey = env.jwt.privateKey): string {
  const signer = createSign(securityConfig.signatureAlgorithm);
  signer.update(payload);
  signer.end();
  return signer.sign(privateKey, 'base64');
}

export function verifySignature(payload: string, signature: string, publicKey = env.jwt.publicKey): boolean {
  try {
    const verifier = createVerify(securityConfig.signatureAlgorithm);
    verifier.update(payload);
    verifier.end();
    return verifier.verify(publicKey, signature, 'base64');
  } catch {
    return false;
  }
}

export function assertFreshTimestamp(timestamp: string, now = Date.now()): void {
  const ms = Date.parse(timestamp);
  if (Number.isNaN(ms)) {
    throw new AppError(401, 'Invalid signature timestamp', 'INVALID_SIGNATURE');
  }
  if (Math.abs(now - ms) > securityConfig.signatureMaxAgeMs) {
    throw new AppError(401, 'Signature timestamp expired', 'SIGNATURE_EXPIRED');
  }
}

export async function consumeNonce(nonce: string, tenantId: string): Promise<void> {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(nonce)) {
    throw new AppError(401, 'Invalid signature nonce', 'INVALID_SIGNATURE');
  }
  const key = `nonce:${tenantId}:${nonce}`;
  if (getRedis()) {
    const stored = await redisSetNxEx(key, '1', securityConfig.nonceTtlSeconds);
    if (!stored) throw new AppError(401, 'Signature nonce already used', 'SIGNATURE_REPLAY');
    return;
  }

  pruneNonces();
  const existing = usedNonces.get(key);
  if (existing && existing > Date.now()) {
    throw new AppError(401, 'Signature nonce already used', 'SIGNATURE_REPLAY');
  }
  usedNonces.set(key, Date.now() + securityConfig.nonceTtlSeconds * 1000);
}

function pruneNonces(): void {
  const now = Date.now();
  for (const [key, exp] of usedNonces) {
    if (exp <= now) usedNonces.delete(key);
  }
}

export function signTransactionReceipt(
  receipt: Omit<TransactionReceipt, 'signature' | 'signedAt'>,
): TransactionReceipt {
  const signedAt = new Date().toISOString();
  const payload = JSON.stringify({ ...receipt, signedAt });
  return { ...receipt, signedAt, signature: generateSignature(payload) };
}

export function verifyTransactionReceipt(receipt: TransactionReceipt): boolean {
  const { signature, ...rest } = receipt;
  const payload = JSON.stringify(rest);
  return verifySignature(payload, signature);
}

