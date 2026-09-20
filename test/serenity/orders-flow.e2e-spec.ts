import request from 'supertest';
import { randomUUID } from 'crypto';
import { APP_URL } from '../utils/constants';
import { firstMenuItemId, loginSerenityDemo } from '../utils/serenity';

function expectOk(status: number) {
  expect([200, 201]).toContain(status);
}

describe('Serenity orders flow (WP-S9)', () => {
  const app = APP_URL;
  let token: string;
  let itemId: string;

  beforeAll(() => {
    ({ token } = await loginSerenityDemo());
    itemId = await firstMenuItemId();
  });

  it('should creates COD order with idempotency, lists, details, cancels, reorders', async () => {
    const idempotencyKey = randomUUID();
    const payload = {
      items: [{ itemId, quantity: 1 }],
      deliveryAddress: 'E2E Test Address',
      paymentMethod: 'COD' as const,
      note: 'wp-s9 e2e',
    };

    const createRes = await request(app)
      .post('/api/v1/orders')
      .auth(token, { type: 'bearer' })
      .set('x-idempotency-key', idempotencyKey)
      .send(payload);
    expectOk(createRes.status);

    const orderId = createRes.body.id as string;
    expect(orderId).toBeDefined();
    expect(createRes.body.outletId).toBeDefined();

    const replay = await request(app)
      .post('/api/v1/orders')
      .auth(token, { type: 'bearer' })
      .set('x-idempotency-key', idempotencyKey)
      .send(payload);
    expectOk(replay.status);
    expect(replay.body.id).toBe(orderId);

    await request(app)
      .post('/api/v1/orders')
      .auth(token, { type: 'bearer' })
      .set('x-idempotency-key', idempotencyKey)
      .send({ ...payload, note: 'different payload' })
      .expect(409);

    const list = await request(app)
      .get('/api/v1/orders?page=1&limit=5')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(Array.isArray(list.body.data)).toBe(true);
    expect(list.body.page).toBe(1);
    expect(typeof list.body.hasNextPage).toBe('boolean');

    const detail = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(detail.body.lifecycle?.timeline).toBeDefined();

    const cancelled = await request(app)
      .post(`/api/v1/orders/${orderId}/cancel`)
      .auth(token, { type: 'bearer' })
      .send({ reason: 'e2e cancel' });
    expectOk(cancelled.status);
    expect(cancelled.body.status).toBe('cancelled');

    const reorder = await request(app)
      .post(`/api/v1/orders/${orderId}/reorder`)
      .auth(token, { type: 'bearer' });
    expectOk(reorder.status);
    expect(Array.isArray(reorder.body.items)).toBe(true);
    expect(reorder.body.items.length).toBeGreaterThan(0);
  });

  it('should rejects create without idempotency key', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .auth(token, { type: 'bearer' })
      .send({
        items: [{ itemId, quantity: 1 }],
        deliveryAddress: 'E2E',
        paymentMethod: 'COD',
      })
      .expect(400);

    expect(
      res.body?.code ?? res.body?.message?.code ?? res.body?.message,
    ).toBeTruthy();
  });
});
