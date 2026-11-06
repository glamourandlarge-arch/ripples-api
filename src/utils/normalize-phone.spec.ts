import { normalizePhone } from './normalize-phone.js';

describe('normalizePhone', () => {
  it('normalizes Nigerian numbers to E.164', () => {
    expect(normalizePhone('+234 801 234 5678')).toBe('+2348012345678');
    expect(normalizePhone('08012345678')).toBe('+2348012345678');
    expect(normalizePhone('2348012345678')).toBe('+2348012345678');
    expect(normalizePhone('+2348012345678')).toBe('+2348012345678');
  });

  it('rejects invalid numbers', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('0701234567')).toBeNull();
    expect(normalizePhone('+15551234567')).toBeNull();
  });
});
