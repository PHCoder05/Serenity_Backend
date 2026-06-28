export const APP_URL = `http://localhost:${process.env.APP_PORT}`;
export const TESTER_EMAIL = 'john.doe@example.com';
export const TESTER_PASSWORD = 'secret';
export const ADMIN_EMAIL = 'admin@example.com';
export const ADMIN_PASSWORD = 'secret';
export const MAIL_HOST = process.env.MAIL_HOST;
export const MAIL_PORT = process.env.MAIL_CLIENT_PORT;

export const PETPOOJA_APP_KEY = process.env.PETPOOJA_APP_KEY ?? 'test-app-key';
export const PETPOOJA_APP_SECRET =
  process.env.PETPOOJA_APP_SECRET ?? 'test-app-secret';
export const PETPOOJA_ACCESS_TOKEN =
  process.env.PETPOOJA_ACCESS_TOKEN ?? 'test-access-token';
export const PETPOOJA_REST_ID =
  process.env.PETPOOJA_RESTAURANT_ID ?? 'test-rest-id';

export const petpoojaAuthHeaders = {
  'app-key': PETPOOJA_APP_KEY,
  'app-secret': PETPOOJA_APP_SECRET,
  'access-token': PETPOOJA_ACCESS_TOKEN,
};
