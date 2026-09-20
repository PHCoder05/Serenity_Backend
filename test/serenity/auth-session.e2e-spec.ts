import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { loginSerenityDemo } from '../utils/serenity';

describe('Serenity auth session (WP-S9)', () => {
  const app = APP_URL;

  it('should logs in, refreshes, reads me, logs out', async () => {
    const { token, refreshToken } = await loginSerenityDemo();

    await request(app)
      .get('/api/v1/auth/me')
      .auth(token, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBeDefined();
      });

    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .auth(refreshToken, { type: 'bearer' })
      .expect(200);

    expect(refreshed.body.token).toBeDefined();
    expect(refreshed.body.refreshToken).toBeDefined();

    await request(app)
      .post('/api/v1/auth/logout')
      .auth(refreshed.body.token, { type: 'bearer' })
      .expect(204);
  });
});
