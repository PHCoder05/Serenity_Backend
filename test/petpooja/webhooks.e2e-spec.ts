import request from 'supertest';
import {
  APP_URL,
  petpoojaAuthHeaders,
  PETPOOJA_REST_ID,
} from '../utils/constants';

describe('Petpooja Webhooks', () => {
  const app = APP_URL;
  const basePath = '/api/v1/petpooja/webhook';

  it('should reject requests without auth headers', () => {
    return request(app)
      .post(`${basePath}/push-menu`)
      .send({
        success: '1',
        restaurants: [],
      })
      .expect(401);
  });

  it('should reject requests on the old double-prefixed route', () => {
    return request(app)
      .post('/api/api/v1/petpooja/webhook/push-menu')
      .set(petpoojaAuthHeaders)
      .send({
        success: '1',
        restaurants: [
          {
            restaurantid: PETPOOJA_REST_ID,
            active: '1',
            details: { restaurantname: 'Pizza Express' },
          },
        ],
      })
      .expect(404);
  });

  it('should accept push-menu webhook', () => {
    return request(app)
      .post(`${basePath}/push-menu`)
      .set(petpoojaAuthHeaders)
      .send({
        success: '1',
        restaurants: [
          {
            restaurantid: PETPOOJA_REST_ID,
            active: '1',
            details: { restaurantname: 'Pizza Express' },
          },
        ],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe('1');
        expect(body.message).toContain('Menu items are successfully listed');
      });
  });

  it('should accept order callback webhook', () => {
    return request(app)
      .post(`${basePath}/callback`)
      .set(petpoojaAuthHeaders)
      .send({
        restID: PETPOOJA_REST_ID,
        orderID: 'A-1001',
        status: '1',
        cancel_reason: '',
        minimum_prep_time: 20,
        is_modified: 'No',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe('1');
      });
  });

  it('should accept item-stock webhook', () => {
    return request(app)
      .post(`${basePath}/item-stock`)
      .set(petpoojaAuthHeaders)
      .send({
        restID: PETPOOJA_REST_ID,
        type: 'item',
        inStock: true,
        itemID: ['7778660', '7778659'],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.code).toBe(200);
        expect(body.status).toBe('success');
      });
  });

  it('should accept item-stock-off webhook', () => {
    return request(app)
      .post(`${basePath}/item-stock-off`)
      .set(petpoojaAuthHeaders)
      .send({
        restID: PETPOOJA_REST_ID,
        type: 'item',
        inStock: false,
        itemID: ['7532306'],
        autoTurnOnTime: 'custom',
        customTurnOnTime: '2020-02-24 18:00',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.code).toBe(200);
        expect(body.status).toBe('success');
      });
  });

  it('should update and fetch store status', async () => {
    await request(app)
      .post(`${basePath}/update-store-status`)
      .set(petpoojaAuthHeaders)
      .send({
        restID: PETPOOJA_REST_ID,
        store_status: 0,
        turn_on_time: '2023-02-17 00:00:00',
        reason: 'Rain',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.http_code).toBe(200);
        expect(body.status).toBe('success');
      });

    await request(app)
      .post(`${basePath}/get-store-status`)
      .set(petpoojaAuthHeaders)
      .send({
        restID: PETPOOJA_REST_ID,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.store_status).toBe('0');
      });
  });
});
