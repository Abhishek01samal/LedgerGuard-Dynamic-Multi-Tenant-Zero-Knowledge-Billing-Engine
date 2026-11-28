import request from 'supertest';
import { createApp } from '../app';

describe('billing e2e (auth + validation)', () => {
  const app = createApp();

  it('requires auth before creating a transaction', async () => {
    const res = await request(app).post('/api/v1/ledger/transactions').send({
      eventId: 'evt_e2e_1',
      description: 'E2E',
      amount: 10,
      currency: 'INR',
      debitAccount: 'customer_001',
      creditAccount: 'merchant_001',
    });
    expect(res.status).toBe(401);
  });

  it('health endpoint is public', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
