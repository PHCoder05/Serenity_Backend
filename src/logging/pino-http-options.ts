import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import type { DestinationStream } from 'pino';
import pinoPretty from 'pino-pretty';
import type { Options } from 'pino-http';

const SECRET_QUERY_KEYS = [
  'token',
  'code',
  'password',
  'refreshToken',
  'accessToken',
  'otp',
  'keySecret',
];

/**
 * Paths pino removes from every log line. Request bodies are not logged, so
 * these cover headers and any object a service passes to the logger.
 */
export const LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'password',
  '*.password',
  'token',
  '*.token',
  'refreshToken',
  '*.refreshToken',
  'accessToken',
  '*.accessToken',
  'otp',
  '*.otp',
  'keySecret',
  '*.keySecret',
  'webhookSecret',
  '*.webhookSecret',
];

export function resolveLogLevel(env: NodeJS.ProcessEnv): string {
  if (env.LOG_LEVEL?.trim()) {
    return env.LOG_LEVEL.trim();
  }
  return 'info';
}

export function correlationIdFrom(
  header: string | string[] | undefined,
): string {
  const value = Array.isArray(header) ? header[0] : header;
  const trimmed = value?.trim() ?? '';
  if (
    trimmed.length > 0 &&
    trimmed.length <= 128 &&
    /^[\w.:-]+$/.test(trimmed)
  ) {
    return trimmed;
  }
  return randomUUID();
}

export function safeRequestUrl(url: string | undefined): string | undefined {
  if (!url) {
    return url;
  }
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) {
    return url;
  }
  const path = url.slice(0, queryIndex);
  const params = new URLSearchParams(url.slice(queryIndex + 1));
  for (const key of SECRET_QUERY_KEYS) {
    if (params.has(key)) {
      params.set(key, '[Redacted]');
    }
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

function shouldSkipRequestLog(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  const path = url.split('?')[0];
  return (
    path === '/' ||
    path === '/health' ||
    path === '/api/v1/health' ||
    path === '/docs' ||
    path.startsWith('/docs/')
  );
}

export function createPinoHttpOptions(env: NodeJS.ProcessEnv): Options {
  return {
    level: resolveLogLevel(env),
    redact: {
      paths: LOG_REDACT_PATHS,
      censor: '[Redacted]',
    },
    genReqId(req: IncomingMessage, res: ServerResponse) {
      const id = correlationIdFrom(req.headers['x-correlation-id']);
      res.setHeader('x-correlation-id', id);
      (req as IncomingMessage & { correlationId?: string }).correlationId = id;
      return id;
    },
    customProps(req) {
      return { correlationId: req.id };
    },
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: safeRequestUrl(req.url),
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
    autoLogging: {
      ignore(req) {
        return shouldSkipRequestLog(req.url);
      },
    },
    customLogLevel(_req, res, err) {
      if (err || res.statusCode >= 500) {
        return 'error';
      }
      if (res.statusCode >= 400) {
        return 'warn';
      }
      return 'info';
    },
  };
}

/**
 * Development uses an in-process pretty stream. Pino's worker transport cannot
 * resolve `pino-pretty` from the Nest compiler, which takes the API down.
 */
export function createPinoHttpParam(
  env: NodeJS.ProcessEnv,
): Options | [Options, DestinationStream] {
  const options = createPinoHttpOptions(env);
  const nodeEnv = (env.NODE_ENV || 'development').toLowerCase();
  if (nodeEnv === 'production' || nodeEnv === 'test') {
    return options;
  }
  return [
    options,
    pinoPretty({
      colorize: true,
      singleLine: true,
      translateTime: 'SYS:HH:MM:ss',
    }),
  ];
}
