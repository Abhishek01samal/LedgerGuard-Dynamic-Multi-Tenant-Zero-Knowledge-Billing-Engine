export const securityConfig = {
  jwtAlgorithm: 'RS256' as const,
  signatureAlgorithm: 'RSA-SHA256' as const,
  /** Reject signed requests older than this. */
  signatureMaxAgeMs: 5 * 60 * 1000,
  nonceTtlSeconds: 10 * 60,
  bodyLimit: '100kb' as const,
  loginWindowMs: 15 * 60 * 1000,
  loginMax: 20,
  apiWindowMs: 15 * 60 * 1000,
  apiMax: 300,
} as const;
