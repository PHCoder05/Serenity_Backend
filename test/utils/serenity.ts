import request from 'supertest';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  APP_URL,
  PETPOOJA_REST_ID,
  petpoojaAuthHeaders,
  SERENITY_DEMO_EMAIL,
  SERENITY_DEMO_PASSWORD,
  TESTER_EMAIL,
  TESTER_PASSWORD,
} from './constants';

export async function loginSerenityDemo(): Promise<{
  token: string;
  refreshToken: string;
}> {
  const { body } = await request(APP_URL)
    .post('/api/v1/auth/email/login')
    .send({
      email: SERENITY_DEMO_EMAIL,
      password: SERENITY_DEMO_PASSWORD,
    })
    .expect(200);

  expect(body.token).toBeDefined();
  expect(body.refreshToken).toBeDefined();
  return { token: body.token, refreshToken: body.refreshToken };
}

export async function loginTester(): Promise<{ token: string }> {
  const { body } = await request(APP_URL)
    .post('/api/v1/auth/email/login')
    .send({
      email: TESTER_EMAIL,
      password: TESTER_PASSWORD,
    })
    .expect(200);

  expect(body.token).toBeDefined();
  return { token: body.token };
}

export async function loginAdmin(): Promise<{ token: string }> {
  const { body } = await request(APP_URL)
    .post('/api/v1/auth/email/login')
    .send({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    })
    .expect(200);

  expect(body.token).toBeDefined();
  return { token: body.token };
}

export async function reopenStore() {
  await request(APP_URL)
    .post('/api/v1/petpooja/webhook/update-store-status')
    .set(petpoojaAuthHeaders)
    .send({
      restID: PETPOOJA_REST_ID,
      store_status: 1,
      turn_on_time: '2026-10-03 00:00:00',
      reason: 'Open',
    })
    .expect(200);
}

export async function firstMenuItemId(): Promise<string> {
  const { body } = await request(APP_URL).get('/api/v1/menu').expect(200);
  const items = (body.items ?? []) as Array<{
    id?: string;
    inStock?: boolean;
    stockQty?: number | null;
  }>;
  const available = items.find(
    (item) =>
      item.id &&
      item.inStock !== false &&
      (item.stockQty == null || item.stockQty > 0),
  );
  const id = available?.id ?? items[0]?.id;
  if (!id) {
    throw new Error(
      'No menu items available for e2e — run seed:run:relational',
    );
  }
  return id;
}
