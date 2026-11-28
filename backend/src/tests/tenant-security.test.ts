import request from 'supertest';
import { createApp } from '../app';
import { login } from '../modules/auth/auth.service';

describe('tenant identity is server-derived', () => {
  const app = createApp();

  it('logs company A in without accepting a tenant switch in the body', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@companya.com',
      password: process.env.SEED_USER_PASSWORD ?? 'password123',
      tenantId: 'company_B',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.user.tenantId).toBe('company_A');
  });

  it('keeps two demo tenants distinct', async () => {
    const a = await login('admin@companya.com', process.env.SEED_USER_PASSWORD ?? 'password123');
    const b = await login('admin@companyb.com', process.env.SEED_USER_PASSWORD ?? 'password123');
    expect(a.user.tenantId).toBe('company_A');
    expect(b.user.tenantId).toBe('company_B');
    expect(a.user.id).not.toBe(b.user.id);
  });
});
