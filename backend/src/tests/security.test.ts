import type { Connection } from 'mongoose';
import request from 'supertest';
import { createApp } from '../app';
import { getTenantConnection } from '../database/tenant.connection';
import { login, signToken } from '../modules/auth/auth.service';

jest.mock('../database/tenant.connection', () => ({
  getTenantConnection: jest.fn(),
  closeAllTenantConnections: jest.fn(),
}));

const tenantConnection = jest.mocked(getTenantConnection);

/** In-memory stand-in so HTTP security checks never wait for a real MongoDB server. */
function fakeConnection(): Connection {
  return {
    db: {
      collection: () => ({
        aggregate: () => ({ toArray: async () => [] }),
      }),
    },
  } as unknown as Connection;
}

describe('auth security', () => {
  const app = createApp();

  beforeEach(() => {
    tenantConnection.mockReset();
    tenantConnection.mockResolvedValue(fakeConnection());
  });

  it('rejects protected routes without a token', async () => {
    const res = await request(app).get('/api/v1/analytics/summary');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a tampered JWT', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/summary')
      .set('Authorization', 'Bearer not-a.real.token');
    expect(res.status).toBe(401);
  });

  it('issues RS256 cookies on valid login', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@companya.com', password: process.env.SEED_USER_PASSWORD ?? 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.tenantId).toBe('company_A');
    expect(res.headers['set-cookie']?.[0]).toContain('lg_token');
  });

  it('does not put tenantId from the query into auth', async () => {
    const { user } = await login('admin@companya.com', process.env.SEED_USER_PASSWORD ?? 'password123');
    const token = signToken(user);
    const res = await request(app)
      .get('/api/v1/analytics/summary?tenantId=company_B')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
    expect(tenantConnection).toHaveBeenCalledWith('company_A');
    expect(tenantConnection).not.toHaveBeenCalledWith('company_B');
  });
});
