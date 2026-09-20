import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { firstMenuItemId, loginSerenityDemo } from '../utils/serenity';

describe('Serenity COD payments (WP-S9)', () => {
  const app = APP_URL;

  it('should creates and confirms a COD payment intent', async () => {
    const { token } = await loginSerenityDemo();
    const itemId = await firstMenuItemId();

    const quote = await request(app)
      .post('/api/v1/orders/quote')
      .send({ items: [{ itemId, quantity: 1 }] });
    expect([200, 201]).toContain(quote.status);

    const intentRes = await request(app)
      .post('/api/v1/payments/intents')
      .auth(token, { type: 'bearer' })
      .send({
        method: 'COD',
        amount: quote.body.total,
        items: [{ itemId, quantity: 1 }],
      });

    expect([200, 201]).toContain(intentRes.status);
    const intentId = intentRes.body.id as string;
    expect(intentId).toBeDefined();

    const confirmed = await request(app)
      .post(`/api/v1/payments/intents/${intentId}/confirm`)
      .auth(token, { type: 'bearer' })
      .send({});
    expect([200, 201]).toContain(confirmed.status);
    expect(confirmed.body.status).toBe('succeeded');

    await request(app)
      .get(`/api/v1/payments/intents/${intentId}`)
      .auth(token, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('succeeded');
      });
  });

  it('should legacy mock webhook is gone', async () => {
    await request(app)
      .post('/api/v1/payments/webhooks/payment-status')
      .send({})
      .expect(410);
  });
});
