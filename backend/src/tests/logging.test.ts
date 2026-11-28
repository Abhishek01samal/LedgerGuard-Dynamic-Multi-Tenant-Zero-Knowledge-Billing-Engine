import { redact } from '../services/audit.service';

describe('audit redaction', () => {
  it('redacts passwords, tokens and authorization headers', () => {
    const result = redact({
      password: 'secret',
      authorization: 'Bearer abc',
      cookie: 'lg_token=abc',
      tenantId: 'company_A',
      nested: { jwtToken: 'abc', amountMinor: 100 },
    }) as Record<string, unknown>;

    expect(result.password).toBe('[REDACTED]');
    expect(result.authorization).toBe('[REDACTED]');
    expect(result.cookie).toBe('[REDACTED]');
    expect(result.tenantId).toBe('company_A');
    expect((result.nested as Record<string, unknown>).jwtToken).toBe('[REDACTED]');
    expect((result.nested as Record<string, unknown>).amountMinor).toBe(100);
  });
});
