import bcrypt from 'bcryptjs';

const REFUSED_SEED_PASSWORDS = new Set([
  'secret',
  'password',
  'secret_for_password',
]);

/** Hash a seed password from the environment. Refuses the published lab password. */
export async function hashSeedPassword(
  envName: string,
): Promise<string | null> {
  const raw = process.env[envName]?.trim() ?? '';
  if (!raw || REFUSED_SEED_PASSWORDS.has(raw)) {
    return null;
  }
  return bcrypt.hash(raw, await bcrypt.genSalt());
}
