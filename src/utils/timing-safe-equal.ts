import { timingSafeEqual } from 'crypto';

export function timingSafeStringEqual(
  actual: string | undefined | null,
  expected: string | undefined | null,
): boolean {
  if (typeof actual !== 'string' || typeof expected !== 'string') {
    return false;
  }
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  if (left.length !== right.length || left.length === 0) {
    return false;
  }
  return timingSafeEqual(left, right);
}
