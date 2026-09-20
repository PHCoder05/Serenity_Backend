import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { firstMenuItemId } from '../utils/serenity';

function expectOk(status: number) {
  expect([200, 201]).toContain(status);
}

describe('Serenity catalog + quote (WP-S9)', () => {
  const app = APP_URL;

  it('should lists menu, DIY catalog, outlets, store status', async () => {
    await request(app)
      .get('/api/v1/menu')
      .expect(200)
      .expect(({ body }) => {
        expect(Array.isArray(body.items)).toBe(true);
        expect(body.items.length).toBeGreaterThan(0);
      });

    await request(app)
      .get('/api/v1/diy/catalog')
      .expect(200)
      .expect(({ body }) => {
        expect(body.bowl?.menuItemId).toBeDefined();
        expect(Array.isArray(body.steps)).toBe(true);
        expect(body.steps.length).toBeGreaterThanOrEqual(3);
      });

    await request(app)
      .get('/api/v1/outlets')
      .expect(200)
      .expect(({ body }) => {
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBeGreaterThan(0);
      });

    await request(app)
      .get('/api/v1/store/status')
      .expect(200)
      .expect(({ body }) => {
        expect(typeof body.isOpen).toBe('boolean');
        expect(body.outletId).toBeDefined();
      });
  });

  it('should quotes publicly and applies SERENITY10 coupon', async () => {
    const itemId = await firstMenuItemId();

    const bare = await request(app)
      .post('/api/v1/orders/quote')
      .send({
        items: [{ itemId, quantity: 1 }],
      });
    expectOk(bare.status);
    expect(bare.body.total).toBeGreaterThan(0);
    expect(bare.body.outletId).toBeDefined();

    const withCoupon = await request(app)
      .post('/api/v1/orders/quote')
      .send({
        items: [{ itemId, quantity: 1 }],
        couponCode: 'SERENITY10',
      });
    expectOk(withCoupon.status);
    expect(withCoupon.body.couponCode).toBe('SERENITY10');
    expect(withCoupon.body.couponDiscount).toBeLessThan(0);
    expect(withCoupon.body.total).toBeLessThan(bare.body.total);
  });

  it('should prices DIY selections server-side', async () => {
    const { body: catalog } = await request(app)
      .get('/api/v1/diy/catalog')
      .expect(200);

    const quote = await request(app)
      .post('/api/v1/orders/quote')
      .send({
        items: [
          {
            itemId: catalog.bowl.menuItemId,
            quantity: 1,
            diySelections: {
              base: 'herbed-rice',
              protein: 'paneer-lababdar',
              fibre: 'thai-slaw',
            },
          },
        ],
      });
    expectOk(quote.status);
    const unit = quote.body.items[0].unitPrice;
    expect(unit).toBe(catalog.bowl.basePrice + 20 + 40 + 20);
  });
});
