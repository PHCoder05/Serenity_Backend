import request from 'supertest';
import { randomUUID } from 'crypto';
import {
  APP_URL,
  PETPOOJA_REST_ID,
  petpoojaAuthHeaders,
} from '../utils/constants';
import {
  createPaidUpiOrder,
  firstMenuItemId,
  loginSerenityDemo,
  reopenStore,
} from '../utils/serenity';

function expectOk(status: number) {
  expect([200, 201]).toContain(status);
}

describe('Serenity kitchen webhooks (local PetPooja payloads)', () => {
  const app = APP_URL;

  beforeAll(async () => {
    await reopenStore();
  });

  afterAll(async () => {
    await reopenStore();
  });

  it('should walks kitchen timeline and rider from callbacks on a paid order', async () => {
    const { token } = await loginSerenityDemo();
    const itemId = await firstMenuItemId();
    const created = await createPaidUpiOrder({
      token,
      itemId,
      idempotencyKey: `kitchen-e2e-${randomUUID()}`,
      note: 'kitchen e2e',
    });
    expectOk(created.status);
    const orderId = created.body.id as string;

    const steps = [
      { status: '1', expect: 'accepted' },
      { status: '3', expect: 'preparing' },
      { status: '5', expect: 'ready' },
      { status: '4', expect: 'dispatched' },
      { status: '10', expect: 'delivered' },
    ];

    for (const step of steps) {
      const res = await request(app)
        .post('/api/v1/petpooja/webhook/callback')
        .set(petpoojaAuthHeaders)
        .send({
          restID: PETPOOJA_REST_ID,
          orderID: orderId,
          status: step.status,
          cancel_reason: '',
          minimum_prep_time: 15,
          is_modified: 'No',
          rider_name: 'Ravi Rider',
          rider_phone_number: '9888888888',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe('1');
    }

    const paid = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .auth(token, { type: 'bearer' });
    expect(paid.status).toBe(200);
    expect(paid.body.status).toBe('delivered');
    expect(paid.body.kitchenSyncStatus).toBe('synced');
    expect(paid.body.rider?.name).toBe('Ravi Rider');
    expect(paid.body.rider?.phone).toBe('9888888888');
    const done = (paid.body.lifecycle?.timeline ?? []).filter(
      (row: { done?: boolean }) => row.done,
    );
    expect(done.map((row: { key: string }) => row.key)).toEqual(
      expect.arrayContaining([
        'confirmed',
        'accepted',
        'preparing',
        'ready',
        'dispatched',
        'delivered',
      ]),
    );
  });

  it('should accepts stock and store-status webhooks and reopens the store', async () => {
    await request(app)
      .post('/api/v1/petpooja/webhook/item-stock')
      .set(petpoojaAuthHeaders)
      .send({
        restID: PETPOOJA_REST_ID,
        type: 'item',
        inStock: true,
        itemID: ['7778660'],
      })
      .expect(200);

    await request(app)
      .post('/api/v1/petpooja/webhook/item-stock-off')
      .set(petpoojaAuthHeaders)
      .send({
        restID: PETPOOJA_REST_ID,
        type: 'item',
        inStock: false,
        itemID: ['7532306'],
        autoTurnOnTime: 'custom',
        customTurnOnTime: '2026-10-03 18:00',
      })
      .expect(200);

    await request(app)
      .post('/api/v1/petpooja/webhook/update-store-status')
      .set(petpoojaAuthHeaders)
      .send({
        restID: PETPOOJA_REST_ID,
        store_status: 0,
        turn_on_time: '2026-10-03 20:00:00',
        reason: 'E2E rain',
      })
      .expect(200);

    const closed = await request(app).get('/api/v1/store/status');
    expect(closed.status).toBe(200);
    expect(closed.body.isOpen).toBe(false);

    await reopenStore();

    const open = await request(app).get('/api/v1/store/status');
    expect(open.status).toBe(200);
    expect(open.body.isOpen).toBe(true);
  });
});
