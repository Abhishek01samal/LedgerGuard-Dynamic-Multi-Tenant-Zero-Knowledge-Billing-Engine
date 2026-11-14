import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { tokenClaimsSchema, type TokenClaims } from './auth.validation';

export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  role: 'admin' | 'member';
}

interface StoredUser extends AuthUser {
  passwordHash: string;
}

/**
 * Week 1: seeded users behind a tiny lookup function.
 * Week 2+: swap getUsers for a lookup in the master/tenant DB
 * (Person 2's tenant layer) without touching the rest of this file.
 */
const BCRYPT_ROUNDS = 10;
let users: StoredUser[] | null = null;
let dummyHash = '';

async function getUsers(): Promise<StoredUser[]> {
  if (users) return users;
  const passwordHash = await bcrypt.hash(env.seedUserPassword, BCRYPT_ROUNDS);
  dummyHash = await bcrypt.hash('not-a-real-password', BCRYPT_ROUNDS);
  users = [
    { id: 'user_001', email: 'admin@companya.com', tenantId: 'company_A', role: 'admin', passwordHash },
    { id: 'user_002', email: 'admin@companyb.com', tenantId: 'company_B', role: 'admin', passwordHash },
  ];
  return users;
}

function toPublic(user: StoredUser): AuthUser {
  return { id: user.id, email: user.email, tenantId: user.tenantId, role: user.role };
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: AuthUser; token: string }> {
  const all = await getUsers();
  const user = all.find((u) => u.email === email);
  // Always run a bcrypt compare so response time doesn't reveal whether the email exists.
  const ok = await bcrypt.compare(password, user ? user.passwordHash : dummyHash);
  if (!user || !ok) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }
  const publicUser = toPublic(user);
  return { user: publicUser, token: signToken(publicUser) };
}

export function signToken(user: AuthUser): string {
  const claims: TokenClaims = {
    sub: user.id,
    email: user.email,
    tenantId: user.tenantId,
    role: user.role,
  };
  return jwt.sign(claims, env.jwt.privateKey, {
    algorithm: 'RS256',
    expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    issuer: env.jwt.issuer,
  });
}

/** Verifies signature, expiry, issuer and claim shape. Throws 401 on any failure. */
export function verifyToken(token: string): TokenClaims {
  try {
    const decoded = jwt.verify(token, env.jwt.publicKey, {
      algorithms: ['RS256'], // never accept HS256/none
      issuer: env.jwt.issuer,
    });
    return tokenClaimsSchema.parse(decoded);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'Token expired', 'TOKEN_EXPIRED');
    }
    throw new AppError(401, 'Invalid token', 'INVALID_TOKEN');
  }
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const all = await getUsers();
  const user = all.find((u) => u.id === id);
  return user ? toPublic(user) : null;
}
