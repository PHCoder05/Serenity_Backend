import { assertProductionBoot, isCorsOriginAllowed } from './boot-guards';

describe('boot-guards', () => {
  const productionEnv = {
    NODE_ENV: 'production',
    AUTH_JWT_SECRET: 'unique-jwt',
    AUTH_REFRESH_SECRET: 'unique-refresh',
    AUTH_FORGOT_SECRET: 'unique-forgot',
    AUTH_CONFIRM_EMAIL_SECRET: 'unique-confirm',
    PAYMENT_GATEWAY: 'razorpay',
    PAYMENT_ALLOW_MOCK: 'false',
    PAYMENT_CREDENTIALS_ENCRYPTION_KEY: 'sixteen-chars-ok',
    FIREBASE_WEB_API_KEY: 'firebase-web-key',
  };

  it('should allow development boot with lab secrets', () => {
    expect(() =>
      assertProductionBoot({
        NODE_ENV: 'development',
        AUTH_JWT_SECRET: 'secret',
        PAYMENT_GATEWAY: 'mock',
      }),
    ).not.toThrow();
  });

  it('should refuse production lab secrets', () => {
    expect(() =>
      assertProductionBoot({
        ...productionEnv,
        AUTH_JWT_SECRET: 'secret',
      }),
    ).toThrow(/AUTH_\*_SECRET/);
  });

  it('should refuse production mock payments', () => {
    expect(() =>
      assertProductionBoot({
        ...productionEnv,
        PAYMENT_GATEWAY: 'mock',
      }),
    ).toThrow(/mock payment gateway/);
  });

  it('should refuse a short payment encryption key', () => {
    expect(() =>
      assertProductionBoot({
        ...productionEnv,
        PAYMENT_CREDENTIALS_ENCRYPTION_KEY: 'short',
      }),
    ).toThrow(/PAYMENT_CREDENTIALS_ENCRYPTION_KEY/);
  });

  it('should refuse production without Firebase phone verification', () => {
    expect(() =>
      assertProductionBoot({
        ...productionEnv,
        FIREBASE_WEB_API_KEY: '',
      }),
    ).toThrow(/FIREBASE_WEB_API_KEY/);
  });

  it('should refuse the console OTP provider in production', () => {
    expect(() =>
      assertProductionBoot({
        ...productionEnv,
        AUTH_OTP_PROVIDER: 'console',
      }),
    ).toThrow(/console OTP/);
  });

  it('should refuse exposing phone OTP codes in production', () => {
    expect(() =>
      assertProductionBoot({
        ...productionEnv,
        AUTH_OTP_DEV_CODE: 'true',
      }),
    ).toThrow(/phone OTP codes/);
  });

  it('should allow production when secrets, a live gateway, and Firebase are set', () => {
    expect(() => assertProductionBoot(productionEnv)).not.toThrow();
  });

  it('should allow native clients with no Origin', () => {
    expect(isCorsOriginAllowed(undefined, productionEnv)).toBe(true);
  });

  it('should allow only listed origins in production', () => {
    const env = {
      ...productionEnv,
      FRONTEND_DOMAIN: 'https://app.example.com',
      CORS_ORIGINS: 'https://staff.example.com',
    };
    expect(isCorsOriginAllowed('https://app.example.com', env)).toBe(true);
    expect(isCorsOriginAllowed('https://staff.example.com', env)).toBe(true);
    expect(isCorsOriginAllowed('http://localhost:5173', env)).toBe(false);
    expect(isCorsOriginAllowed('https://dev9.alligators.dev', env)).toBe(false);
  });

  it('should allow localhost and alligators.dev in development', () => {
    const env = { NODE_ENV: 'development' };
    expect(isCorsOriginAllowed('http://localhost:5173', env)).toBe(true);
    expect(isCorsOriginAllowed('https://dev9.alligators.dev', env)).toBe(true);
  });

  it('should allow private LAN origins in development', () => {
    const env = { NODE_ENV: 'development' };
    expect(isCorsOriginAllowed('http://10.51.165.90:8082', env)).toBe(true);
    expect(isCorsOriginAllowed('http://192.168.1.20:8081', env)).toBe(true);
    expect(isCorsOriginAllowed('http://172.16.0.8:8082', env)).toBe(true);
    expect(isCorsOriginAllowed('http://8.8.8.8:8082', env)).toBe(false);
  });

  it('should reject private LAN origins in production', () => {
    expect(
      isCorsOriginAllowed('http://10.51.165.90:8082', productionEnv),
    ).toBe(false);
  });
});
