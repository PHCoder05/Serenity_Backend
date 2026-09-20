import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

function isProductionRuntime(): boolean {
  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
  const appEnv = (
    process.env.APP_ENV ||
    process.env.NODE_CONFIG_ENV ||
    ''
  ).toLowerCase();
  return (
    nodeEnv === 'production' ||
    appEnv === 'production' ||
    appEnv === 'prod' ||
    process.env.PAYMENT_REQUIRE_ENCRYPTION_KEY === 'true'
  );
}

function deriveKey(): Buffer {
  const raw = process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
  if (!raw || raw.trim().length < 16) {
    if (isProductionRuntime()) {
      throw new Error(
        'PAYMENT_CREDENTIALS_ENCRYPTION_KEY must be set (min 16 chars) in production',
      );
    }
    return createHash('sha256')
      .update('serenity-dev-payment-credentials-key')
      .digest();
  }
  return createHash('sha256').update(raw).digest();
}

/** Encrypt UTF-8 plaintext → base64(iv|tag|ciphertext). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, deriveKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + 16);
  const data = buf.subarray(IV_LEN + 16);
  const decipher = createDecipheriv(ALGO, deriveKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8',
  );
}

export function maskSecret(value: string | undefined | null, keep = 4): string {
  if (!value) return '';
  if (value.length <= keep) return '*'.repeat(value.length);
  return `${value.slice(0, 4)}${'*'.repeat(Math.max(4, value.length - keep - 4))}${value.slice(-keep)}`;
}
