import { isValidPhone, normalizePhone } from './phone.util';

describe('phone.util', () => {
  it('should strips non-digits and India 91 prefix', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('9876543210');
    expect(normalizePhone('919876543210')).toBe('9876543210');
    expect(normalizePhone('09876543210')).toBe('9876543210');
  });

  it('should validates length', () => {
    expect(isValidPhone('9876543210')).toBe(true);
    expect(isValidPhone('123')).toBe(false);
  });
});
