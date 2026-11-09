import { isE164Phone, normalizeE164 } from './normalize-e164.js';

describe('normalizeE164', () => {
  it('accepts international numbers', () => {
    expect(normalizeE164('+2348012345678')).toBe('+2348012345678');
    expect(normalizeE164('+447911123456')).toBe('+447911123456');
    expect(normalizeE164('+12025550123')).toBe('+12025550123');
    expect(normalizeE164('2348012345678')).toBe('+2348012345678');
  });

  it('rejects invalid values', () => {
    expect(normalizeE164('')).toBeNull();
    expect(normalizeE164('123')).toBeNull();
    expect(normalizeE164('+0123')).toBeNull();
    expect(isE164Phone('+2348012345678')).toBe(true);
    expect(isE164Phone('not-a-phone')).toBe(false);
  });
});
