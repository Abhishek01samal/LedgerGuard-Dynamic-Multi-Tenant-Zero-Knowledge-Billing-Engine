import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8000),
  MONGODB_MASTER_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/ledgerguard_master'),
  JWT_PRIVATE_KEY_PATH: z.string().default('./keys/private.pem'),
  JWT_PUBLIC_KEY_PATH: z.string().default('./keys/public.pem'),
  // Optional inline PEMs (useful for CI/tests); take priority over the paths.
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_ISSUER: z.string().default('ledgerguard'),
  COOKIE_NAME: z.string().default('lg_token'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  SEED_USER_PASSWORD: z.string().min(8).default('password123'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
const raw = parsed.data;

function loadKey(inline: string | undefined, filePath: string, label: string): string {
  if (inline) return inline.replace(/\\n/g, '\n');
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`Missing ${label} at ${resolved}. Run "npm run keys:generate" in backend/.`);
    process.exit(1);
  }
  return fs.readFileSync(resolved, 'utf8');
}

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === 'production',
  port: raw.PORT,
  mongoMasterUri: raw.MONGODB_MASTER_URI,
  jwt: {
    privateKey: loadKey(raw.JWT_PRIVATE_KEY, raw.JWT_PRIVATE_KEY_PATH, 'JWT private key'),
    publicKey: loadKey(raw.JWT_PUBLIC_KEY, raw.JWT_PUBLIC_KEY_PATH, 'JWT public key'),
    expiresIn: raw.JWT_EXPIRES_IN,
    issuer: raw.JWT_ISSUER,
  },
  cookieName: raw.COOKIE_NAME,
  frontendUrl: raw.FRONTEND_URL,
  seedUserPassword: raw.SEED_USER_PASSWORD,
} as const;
