import {
  correlationIdFrom,
  createPinoHttpOptions,
  createPinoHttpParam,
  resolveLogLevel,
  safeRequestUrl,
} from './pino-http-options';
import { resolveTypeormLogging } from './typeorm-logging';

describe('request logging', () => {
  it('should keep a client correlation id that is safe to echo', () => {
    expect(correlationIdFrom('order-42.abc:1')).toBe('order-42.abc:1');
  });

  it('should replace a missing or unsafe correlation id', () => {
    expect(correlationIdFrom(undefined)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(correlationIdFrom('token with spaces')).not.toBe(
      'token with spaces',
    );
    expect(correlationIdFrom('x'.repeat(200))).toHaveLength(36);
  });

  it('should strip secrets from the logged URL', () => {
    expect(safeRequestUrl('/api/v1/menu?outletId=1')).toBe(
      '/api/v1/menu?outletId=1',
    );
    expect(safeRequestUrl('/api/v1/auth?token=abc&code=123456')).toContain(
      'token=%5BRedacted%5D',
    );
    expect(safeRequestUrl('/api/v1/auth?token=abc&code=123456')).not.toContain(
      'abc',
    );
    expect(safeRequestUrl('/api/v1/auth?token=abc&code=123456')).not.toContain(
      '123456',
    );
  });

  it('should default to info and pretty-print only outside production and test', () => {
    expect(resolveLogLevel({})).toBe('info');
    expect(resolveLogLevel({ LOG_LEVEL: 'debug' })).toBe('debug');

    const development = createPinoHttpParam({ NODE_ENV: 'development' });
    expect(Array.isArray(development)).toBe(true);

    const production = createPinoHttpParam({ NODE_ENV: 'production' });
    expect(Array.isArray(production)).toBe(false);
    expect(createPinoHttpOptions({ NODE_ENV: 'production' }).level).toBe(
      'info',
    );
  });

  it('should skip health probes so the alert check does not fill the log', () => {
    const options = createPinoHttpOptions({ NODE_ENV: 'production' });
    const autoLogging = options.autoLogging;
    if (
      !autoLogging ||
      typeof autoLogging === 'boolean' ||
      !autoLogging.ignore
    ) {
      throw new Error('health probes should be ignored');
    }
    const ignore = autoLogging.ignore as (req: { url?: string }) => boolean;
    expect(ignore({ url: '/api/v1/health' })).toBe(true);
    expect(ignore({ url: '/api/v1/menu/home' })).toBe(false);
  });

  it('should print SQL only when asked', () => {
    expect(resolveTypeormLogging({})).toEqual(['error', 'warn', 'migration']);
    expect(resolveTypeormLogging({ DATABASE_LOGGING: 'true' })).toBe(true);
    expect(resolveTypeormLogging({ DATABASE_LOGGING: 'false' })).toBe(false);
    expect(resolveTypeormLogging({ DATABASE_LOGGING: 'query,error' })).toEqual([
      'query',
      'error',
    ]);
  });
});
