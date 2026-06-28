import request from 'supertest';
import {
  APP_URL,
  petpoojaAuthHeaders,
  PETPOOJA_REST_ID,
} from '../utils/constants';

describe('Petpooja Outbound APIs', () => {
  const app = APP_URL;
  const basePath = '/api/v1/petpooja/outbound';

  it('should reject requests without auth headers', () => {
    return request(app)
      .post(`${basePath}/menu/fetch`)
      .send({ restID: PETPOOJA_REST_ID })
      .expect(401);
  });

  it('should save order via mocked PetPooja API', () => {
    return request(app)
      .post(`${basePath}/orders/save`)
      .set(petpoojaAuthHeaders)
      .send({
        restID: PETPOOJA_REST_ID,
        orderinfo: {
          Order: {
            details: {
              orderID: 'A-2001',
              clientOrderID: 'A-2001',
              order_type: 'H',
              payment_type: 'ONLINE',
            },
          },
        },
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe('1');
        expect(body.orderID).toBeDefined();
      });
  });

  it('should fetch menu via mocked PetPooja API', () => {
    return request(app)
      .post(`${basePath}/menu/fetch`)
      .set(petpoojaAuthHeaders)
      .send({ restID: PETPOOJA_REST_ID })
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe('1');
        expect(body.restaurants).toBeDefined();
      });
  });

  it('should update order status via mocked PetPooja API', () => {
    return request(app)
      .post(`${basePath}/orders/update-status`)
      .set(petpoojaAuthHeaders)
      .send({
        restID: PETPOOJA_REST_ID,
        orderID: 'A-2001',
        clientorderID: 'A-2001',
        cancelReason: 'Customer cancelled',
        status: '-1',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe('1');
      });
  });

  it('should update rider status via mocked PetPooja API', () => {
    return request(app)
      .post(`${basePath}/delivery/rider-status`)
      .set(petpoojaAuthHeaders)
      .send({
        order_id: 2001,
        outlet_id: PETPOOJA_REST_ID,
        status: '1',
        rider_data: {
          rider_name: 'John Rider',
          rider_phone_number: '9999999999',
        },
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe('1');
      });
  });
});
