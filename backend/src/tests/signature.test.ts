import {
  assertFreshTimestamp,
  canonicalString,
  consumeNonce,
  generateSignature,
  hashBody,
  verifySignature,
} from '../modules/security/signature.service';

describe('RSA-SHA256 signatures', () => {
  const payload = canonicalString({
    method: 'POST',
    path: '/api/v1/ledger/transactions',
    timestamp: '2026-11-28T10:30:00.000Z',
    nonce: 'nonce_abc12345',
    bodyHash: hashBody('{"eventId":"evt_1"}'),
  });

  it('signs and verifies a canonical payload', () => {
    const signature = generateSignature(payload);
    expect(verifySignature(payload, signature)).toBe(true);
  });

  it('rejects a modified payload', () => {
    const signature = generateSignature(payload);
    expect(verifySignature(`${payload}\ntampered`, signature)).toBe(false);
  });

  it('rejects an invalid signature blob', () => {
    expect(verifySignature(payload, 'not-a-signature')).toBe(false);
  });

  it('rejects expired timestamps', () => {
    expect(() => assertFreshTimestamp('2020-01-01T00:00:00.000Z')).toThrow('Signature timestamp expired');
  });

  it('rejects reused nonces', async () => {
    await consumeNonce('nonce_replay_1', 'company_A');
    await expect(consumeNonce('nonce_replay_1', 'company_A')).rejects.toThrow('already used');
  });
});
