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

  if (!env.FIREBASE_WEB_API_KEY?.trim()) {
    throw new Error(
      'Refusing to boot: set FIREBASE_WEB_API_KEY so phone sign-in can verify Firebase SMS',
    );
  }

  const otpProvider = (env.AUTH_OTP_PROVIDER || '').toLowerCase();
  if (otpProvider === 'console') {
    throw new Error(
      'Refusing to boot: production phone SMS is Firebase, not the console OTP',
    );
  }

  if (env.AUTH_OTP_DEV_CODE === 'true') {
    throw new Error(
      'Refusing to boot: production cannot return phone OTP codes',
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
    return isDevBrowserHost(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function isDevBrowserHost(hostname: string): boolean {
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.alligators.dev')
  ) {
    return true;
  }

  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!match) {
    return false;
  }

  const octets = match.slice(1).map((part) => Number(part));
  if (octets.some((part) => !Number.isInteger(part) || part > 255)) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 10 ||
    (first === 192 && second === 168) ||
    (first === 172 && second >= 16 && second <= 31)
  );
}
