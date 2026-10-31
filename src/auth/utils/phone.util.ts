/** Normalize to digits only; strip leading country 91 when 12 digits. */
export function normalizePhone(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

export function isValidPhone(phone: string): boolean {
  return phone.length >= 10 && phone.length <= 15;
}

/** Enough to tell numbers apart in a log line, without storing the full phone. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) {
    return '****';
  }
  return `${digits.slice(0, 2)}****${digits.slice(-2)}`;
}
