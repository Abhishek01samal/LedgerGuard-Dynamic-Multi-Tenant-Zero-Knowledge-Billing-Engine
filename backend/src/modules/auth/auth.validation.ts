import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required').max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const roleSchema = z.enum(['admin', 'member']);

/** Shape of the verified JWT payload. Anything else is rejected. */
export const tokenClaimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  tenantId: z.string().min(1),
  role: roleSchema,
});

export type TokenClaims = z.infer<typeof tokenClaimsSchema>;
