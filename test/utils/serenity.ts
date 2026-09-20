import request from 'supertest';
import {
  APP_URL,
  SERENITY_DEMO_EMAIL,
  SERENITY_DEMO_PASSWORD,
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

export async function firstMenuItemId(): Promise<string> {
  const { body } = await request(APP_URL).get('/api/v1/menu').expect(200);
  const id = body.items?.[0]?.id as string | undefined;
  if (!id) {
    throw new Error(
      'No menu items available for e2e — run seed:run:relational',
    );
  }
  return id;
}
