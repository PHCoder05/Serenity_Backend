const WEAK_SECRET = /^(secret|secret_for_)/i;

export function assertProductionBoot(
  env: NodeJS.Dict<string | undefined>,
): void {
  if ((env.NODE_ENV || '').toLowerCase() !== 'production') {
    return;
  }

  const weakSecrets = [
    env.AUTH_JWT_SECRET,
    env.AUTH_REFRESH_SECRET,
    env.AUTH_FORGOT_SECRET,
    env.AUTH_CONFIRM_EMAIL_SECRET,
  ].filter((value) => !value || WEAK_SECRET.test(value));
  if (weakSecrets.length) {
    throw new Error(
      'Refusing to boot: set unique AUTH_*_SECRET values before production',
    );
  }

  const gateway = (env.PAYMENT_GATEWAY || '').toLowerCase();
  if (gateway === 'mock' || env.PAYMENT_ALLOW_MOCK === 'true') {
    throw new Error(
      'Refusing to boot: production cannot use the mock payment gateway',
    );
  }

  const encryptionKey = env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY || '';
  if (encryptionKey.length < 16) {
    throw new Error(
      'Refusing to boot: set PAYMENT_CREDENTIALS_ENCRYPTION_KEY (min 16 chars)',
    );
  }
}

export function isCorsOriginAllowed(
  origin: string | undefined,
  env: NodeJS.Dict<string | undefined>,
): boolean {
  if (!origin) {
    return true;
  }

  const extras = (env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (extras.includes(origin)) {
    return true;
  }

  const frontend = env.FRONTEND_DOMAIN?.replace(/\/$/, '');
  if (frontend && origin === frontend) {
    return true;
  }

  if ((env.NODE_ENV || '').toLowerCase() === 'production') {
    return false;
  }

  try {
    const hostname = new URL(origin).hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.alligators.dev')
    );
  } catch {
    return false;
  }
}
