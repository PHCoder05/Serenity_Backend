import request from 'supertest';
import { randomUUID } from 'crypto';
import { APP_URL } from '../utils/constants';
import {
  createPaidUpiOrder,
  firstMenuItemId,
  loginAdmin,
  loginSerenityDemo,
  reopenStore,
} from '../utils/serenity';

function expectOk(status: number) {
  expect([200, 201]).toContain(status);
}

describe('Serenity orders flow (WP-S9)', () => {
  const app = APP_URL;
  let token: string;
  let itemId: string;

  beforeAll(async () => {
    await reopenStore();
    ({ token } = await loginSerenityDemo());
    itemId = await firstMenuItemId();
  });

  it('should creates online order with idempotency, lists, details, invoice, cancels, reorders', async () => {
    const idempotencyKey = randomUUID();
    const createRes = await createPaidUpiOrder({
      token,
      itemId,
      idempotencyKey,
      note: 'wp-s9 e2e',
    });
    expectOk(createRes.status);

    const orderId = createRes.body.id as string;
    expect(orderId).toBeDefined();
    expect(createRes.body.outletId).toBeDefined();
    expect(createRes.body.amountPaid).toBe(createRes.body.total);
    expect(createRes.body.paidVia).toBe('UPI');

    const replay = await request(app)
      .post('/api/v1/orders')
      .auth(token, { type: 'bearer' })
      .set('x-idempotency-key', idempotencyKey)
      .send({
        items: [{ itemId, quantity: 1 }],
        fulfillmentType: 'takeaway',
        deliveryAddress: 'Serenity Café, Rajbaug (Takeaway)',
        paymentMethod: 'UPI',
        paymentIntentId: createRes.body.paymentIntentId,
        note: 'wp-s9 e2e',
      });
    expectOk(replay.status);
    expect(replay.body.id).toBe(orderId);

    await request(app)
      .post('/api/v1/orders')
      .auth(token, { type: 'bearer' })
      .set('x-idempotency-key', idempotencyKey)
      .send({
        items: [{ itemId, quantity: 1 }],
        fulfillmentType: 'takeaway',
        deliveryAddress: 'Serenity Café, Rajbaug (Takeaway)',
        paymentMethod: 'UPI',
        paymentIntentId: createRes.body.paymentIntentId,
        note: 'different payload',
      })
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

    const invoice = await request(app)
      .get(`/api/v1/orders/${orderId}/invoice`)
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(invoice.body.invoiceNumber).toMatch(/^INV-/);
    expect(invoice.body.html).toContain('Tax Invoice');
    expect(invoice.body.html).toContain('GSTIN');

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
        fulfillmentType: 'takeaway',
        deliveryAddress: 'Serenity Café, Rajbaug (Takeaway)',
        paymentMethod: 'UPI',
        paymentIntentId: 'pi-missing',
      })
      .expect(400);

    expect(
      res.body?.code ?? res.body?.message?.code ?? res.body?.message,
    ).toBeTruthy();
  });

  it('should rejects guest and COD checkout', async () => {
    const { token: adminToken } = await loginAdmin();

    const guestRes = await request(app)
      .post('/api/v1/orders')
      .set('x-idempotency-key', `guest-e2e-${randomUUID()}`)
      .send({
        items: [{ itemId, quantity: 1 }],
        fulfillmentType: 'takeaway',
        deliveryAddress: 'Serenity Café, Rajbaug (Takeaway)',
        paymentMethod: 'UPI',
        guest: { name: 'E2E Guest', phone: '9611111111' },
      });
    expect(guestRes.status).toBe(400);
    expect(
      guestRes.body?.code ?? guestRes.body?.message?.code,
    ).toBe('ACCOUNT_REQUIRED');

    const codRes = await request(app)
      .post('/api/v1/orders')
      .auth(token, { type: 'bearer' })
      .set('x-idempotency-key', `cod-e2e-${randomUUID()}`)
      .send({
        items: [{ itemId, quantity: 1 }],
        fulfillmentType: 'takeaway',
        deliveryAddress: 'Serenity Café, Rajbaug (Takeaway)',
        paymentMethod: 'COD',
      });
    expect(codRes.status).toBe(400);

    const locations = await request(app)
      .get('/api/v1/menu/delivery-locations')
      .expect(200);
    expect(locations.body.data.length).toBeGreaterThan(0);

    const feedback = await request(app)
      .get('/api/v1/admin/support/feedback')
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(Array.isArray(feedback.body.data)).toBe(true);
  });
});
