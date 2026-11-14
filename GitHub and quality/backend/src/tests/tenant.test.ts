import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { createApp } from '../app';
import { getTenantContext, requireAuth } from '../middleware/auth.middleware';
import { AppError, errorHandler } from '../middleware/error.middleware';
import { AUTH_ROUTES } from '../../../shared/contracts/auth.contract';
import { COMPANY_A, COMPANY_B, PASSWORD, signRs256, tamperPayload } from './helpers';

const app = createApp();

/**
 * Probe app: exposes exactly what the middleware hands to the database layer.
 * (/me re-reads the user from the store, so it cannot prove which tenantId the
 * middleware attached to the request.)
 */
const probe = express();
probe.use(cookieParser());
probe.get('/probe', requireAuth, (req, res) => {
  res.json(getTenantContext(req));
});
probe.use(errorHandler);

describe('tenant identity comes only from the verified JWT', () => {
  it('Company A and Company B resolve to different tenants (concurrently)', async () => {
    const a = request.agent(app);
    const b = request.agent(app);
    await Promise.all([
      a.post(AUTH_ROUTES.login).send({ email: COMPANY_A.email, password: PASSWORD }),
      b.post(AUTH_ROUTES.login).send({ email: COMPANY_B.email, password: PASSWORD }),
    ]);
    const [resA, resB] = await Promise.all([a.get(AUTH_ROUTES.me), b.get(AUTH_ROUTES.me)]);
    expect(resA.body.data.user.tenantId).toBe('company_A');
    expect(resB.body.data.user.tenantId).toBe('company_B');
  });

  it('ignores a spoofed X-Tenant-Id header, query string and body', async () => {
    const agent = request.agent(app);
    await agent.post(AUTH_ROUTES.login).send({ email: COMPANY_A.email, password: PASSWORD });
    const res = await agent
      .get(`${AUTH_ROUTES.me}?tenantId=company_B`)
      .set('X-Tenant-Id', 'company_B')
      .send({ tenantId: 'company_B' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.tenantId).toBe('company_A');
  });

  it('middleware tenant context ignores X-Tenant-Id, query and body', async () => {
    const res = await request(probe)
      .get('/probe?tenantId=company_B&tenant=company_B')
      .set('Authorization', `Bearer ${signRs256()}`)
      .set('X-Tenant-Id', 'company_B')
      .set('X-Tenant', 'company_B')
      .send({ tenantId: 'company_B' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tenantId: 'company_A', userId: 'user_001' });
  });

  it('middleware tenant context follows the token claim for Company B', async () => {
    const token = signRs256({ sub: 'user_002', tenantId: 'company_B' });
    const res = await request(probe).get('/probe').set('Authorization', `Bearer ${token}`);
    expect(res.body.tenantId).toBe('company_B');
  });

  it('probe route rejects unauthenticated requests before any tenant is resolved', async () => {
    const res = await request(probe).get('/probe').set('X-Tenant-Id', 'company_A');
    expect(res.status).toBe(401);
  });

  it('rejects a token whose payload was edited to another tenant (bad signature)', async () => {
    const real = signRs256();
    const forged = tamperPayload(real, { tenantId: 'company_B' });
    const res = await request(app).get(AUTH_ROUTES.me).set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });
});

describe('getTenantContext (hand-off to the database layer)', () => {
  it('returns tenantId and userId from verified claims', () => {
    const ctx = getTenantContext({
      auth: { sub: 'user_002', email: 'admin@companyb.com', tenantId: 'company_B', role: 'admin' },
    });
    expect(ctx).toEqual({ tenantId: 'company_B', userId: 'user_002' });
  });

  it('throws 401 when the request was never authenticated', () => {
    expect(() => getTenantContext({})).toThrow(AppError);
    try {
      getTenantContext({});
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(401);
    }
  });
});

/**
 * Person 2's modules are not merged yet. Turn each todo into a real test when
 * database/tenant.connection.ts and GET /api/v1/tenants/current land.
 */
describe('tenant database layer (pending Person 2)', () => {
  it.todo('getTenantConnection("company_A") and ("company_B") return different databases');
  it.todo('getTenantConnection reuses the cached connection for the same tenant');
  it.todo('getTenantConnection rejects a tenantId that is not in the registry');
  it.todo('a connection failure is surfaced as a handled error, not a crash');
  it.todo(
    'GET /api/v1/tenants/current returns { tenantId, databaseStatus } (isTenantCurrentResponse)',
  );
  it.todo('GET /api/v1/tenants/current without a token returns 401');
});
