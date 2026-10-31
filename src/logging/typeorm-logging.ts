import { LoggerOptions } from 'typeorm';

const TYPEORM_LOG_LEVELS = [
  'query',
  'error',
  'schema',
  'warn',
  'info',
  'log',
  'migration',
] as const;

type TypeormLogLevel = (typeof TYPEORM_LOG_LEVELS)[number];

function isTypeormLogLevel(value: string): value is TypeormLogLevel {
  return (TYPEORM_LOG_LEVELS as readonly string[]).includes(value);
}

/**
 * Full SQL is off unless DATABASE_LOGGING asks for it. The default keeps
 * errors, warnings, and migrations, which is enough to debug the database
 * without printing passwords and session rows on every poll.
 */
export function resolveTypeormLogging(env: NodeJS.ProcessEnv): LoggerOptions {
  const raw = (env.DATABASE_LOGGING || '').trim().toLowerCase();
  if (raw === 'true' || raw === 'all') {
    return true;
  }
  if (raw === 'false' || raw === 'off' || raw === 'none') {
    return false;
  }
  if (raw) {
    const levels = raw
      .split(',')
      .map((part) => part.trim())
      .filter(isTypeormLogLevel);
    if (levels.length > 0) {
      return levels;
    }
  }
  return ['error', 'warn', 'migration'];
}
