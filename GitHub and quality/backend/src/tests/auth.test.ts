import request from 'supertest';
import { createApp } from '../app';
import { isApiErrorResponse, isHealthResponse } from '../../../shared/contracts/common.contract';
import {
  AUTH_ERROR_CODES,
  AUTH_ROUTES,
  isLoginResponse,
  isMeResponse,
} from '../../../shared/contracts/auth.contract';
import {
  COMPANY_A,
  COMPANY_B,
  PASSWORD,
  algNoneToken,
  foreignPrivateKey,
  hs256WithPublicKeyToken,
  setCookies,
  signRs256,
} from './helpers';

const app = createApp();
const COOKIE = 'lg_token';

async function expectError(res: request.Response, status: number, code: string): Promise<void> {
  expect(res.status).toBe(status);
  expect(isApiErrorResponse(res.body)).toBe(true);
  expect(res.body.code).toBe(code);
}

describe('GET /health', () => {
  it('returns the agreed health contract', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(isHealthResponse(res.body)).toBe(true);
    expect(res.body.message).toBe('LedgerGuard API is running');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('logs in Company A and matches the contract', async () => {
    const res = await request(app)
      .post(AUTH_ROUTES.login)
      .send({ email: COMPANY_A.email, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(isLoginResponse(res.body)).toBe(true);
    expect(res.body.data.user).toEqual({
      id: 'user_001',
      email: 'admin@companya.com',
      tenantId: 'company_A',
      role: 'admin',
    });
  });

  it('delivers the token in an HttpOnly cookie, never in the body', async () => {
    const res = await request(app)
      .post(AUTH_ROUTES.login)
      .send({ email: COMPANY_A.email, password: PASSWORD });
    const cookie = setCookies(res).find((c) => c.startsWith(`${COOKIE}=`));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/password/i);
    expect(raw).not.toMatch(/eyJ/); // no JWT in the body
  });

  it('treats the email case-insensitively', async () => {
    const res = await request(app)
      .post(AUTH_ROUTES.login)
      .send({ email: '  ADMIN@COMPANYB.COM ', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.user.tenantId).toBe('company_B');
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post(AUTH_ROUTES.login)
      .send({ email: COMPANY_A.email, password: 'wrong-password' });
    await expectError(res, 401, AUTH_ERROR_CODES.invalidCredentials);
    expect(setCookies(res)).toHaveLength(0);
  });

  it('gives the same error for an unknown email (no user enumeration)', async () => {
    const wrongPw = await request(app)
      .post(AUTH_ROUTES.login)
      .send({ email: COMPANY_A.email, password: 'nope' });
    const unknown = await request(app)
      .post(AUTH_ROUTES.login)
      .send({ email: 'ghost@nowhere.com', password: 'nope' });
    await expectError(unknown, 401, AUTH_ERROR_CODES.invalidCredentials);
    expect(unknown.body.message).toBe(wrongPw.body.message);
  });

  it.each([
    ['empty body', {}],
    ['bad email', { email: 'not-an-email', password: PASSWORD }],
    ['missing password', { email: COMPANY_A.email }],
    ['empty password', { email: COMPANY_A.email, password: '' }],
  ])('returns 400 with field errors for %s', async (_name, body) => {
    const res = await request(app).post(AUTH_ROUTES.login).send(body);
    await expectError(res, 400, AUTH_ERROR_CODES.validation);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns the current user for a logged-in session', async () => {
    const agent = request.agent(app);
    await agent.post(AUTH_ROUTES.login).send({ email: COMPANY_A.email, password: PASSWORD });
    const res = await agent.get(AUTH_ROUTES.me);
    expect(res.status).toBe(200);
    expect(isMeResponse(res.body)).toBe(true);
    expect(res.body.data.user.tenantId).toBe('company_A');
  });

  it('also accepts a valid Bearer token', async () => {
    const res = await request(app)
      .get(AUTH_ROUTES.me)
      .set('Authorization', `Bearer ${signRs256()}`);
    expect(res.status).toBe(200);
  });

  it('rejects requests without a token', async () => {
    await expectError(
      await request(app).get(AUTH_ROUTES.me),
      401,
      AUTH_ERROR_CODES.unauthenticated,
    );
  });

  it('rejects a garbage token', async () => {
    const res = await request(app).get(AUTH_ROUTES.me).set('Authorization', 'Bearer abc.def.ghi');
    await expectError(res, 401, AUTH_ERROR_CODES.invalidToken);
  });

  it('rejects an expired token', async () => {
    const res = await request(app)
      .get(AUTH_ROUTES.me)
      .set('Authorization', `Bearer ${signRs256({}, { expired: true })}`);
    await expectError(res, 401, AUTH_ERROR_CODES.tokenExpired);
  });

  it('rejects a token signed with a different private key', async () => {
    const token = signRs256({}, { privateKey: foreignPrivateKey() });
    const res = await request(app).get(AUTH_ROUTES.me).set('Authorization', `Bearer ${token}`);
    await expectError(res, 401, AUTH_ERROR_CODES.invalidToken);
  });

  it('rejects alg:none tokens', async () => {
    const res = await request(app)
      .get(AUTH_ROUTES.me)
      .set('Authorization', `Bearer ${algNoneToken({ tenantId: 'company_B' })}`);
    await expectError(res, 401, AUTH_ERROR_CODES.invalidToken);
  });

  it('rejects HS256 key-confusion tokens', async () => {
    const res = await request(app)
      .get(AUTH_ROUTES.me)
      .set('Authorization', `Bearer ${hs256WithPublicKeyToken()}`);
    await expectError(res, 401, AUTH_ERROR_CODES.invalidToken);
  });

  it('rejects a token from the wrong issuer', async () => {
    const token = signRs256({}, { issuer: 'someone-else' });
    const res = await request(app).get(AUTH_ROUTES.me).set('Authorization', `Bearer ${token}`);
    await expectError(res, 401, AUTH_ERROR_CODES.invalidToken);
  });

  it.each([
    ['missing tenantId', { tenantId: undefined }],
    ['empty tenantId', { tenantId: '' }],
    ['unknown role', { role: 'superuser' }],
    ['missing subject', { sub: undefined }],
  ])('rejects a validly signed token with %s', async (_name, claims) => {
    const token = signRs256(claims);
    const res = await request(app).get(AUTH_ROUTES.me).set('Authorization', `Bearer ${token}`);
    await expectError(res, 401, AUTH_ERROR_CODES.invalidToken);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('clears the cookie so /me is rejected afterwards', async () => {
    const agent = request.agent(app);
    await agent.post(AUTH_ROUTES.login).send({ email: COMPANY_B.email, password: PASSWORD });
    expect((await agent.get(AUTH_ROUTES.me)).status).toBe(200);

    const out = await agent.post(AUTH_ROUTES.logout);
    expect(out.status).toBe(200);
    expect(setCookies(out).some((c) => c.startsWith(`${COOKIE}=;`))).toBe(true);

    await expectError(await agent.get(AUTH_ROUTES.me), 401, AUTH_ERROR_CODES.unauthenticated);
  });
});

describe('unknown routes', () => {
  it('returns a 404 in the standard error shape', async () => {
    await expectError(await request(app).get('/api/v1/nope'), 404, 'NOT_FOUND');
  });
});
