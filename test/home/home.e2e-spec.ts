import request from 'supertest';
import { APP_URL } from '../utils/constants';

describe('Home', () => {
  const app = APP_URL;

  it('should return app info: / (GET)', () => {
    return request(app)
      .get('/')
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBeDefined();
      });
  });
});
