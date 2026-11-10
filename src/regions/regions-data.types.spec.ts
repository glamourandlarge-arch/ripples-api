import { parseCoordinate } from './regions-data.types.js';

describe('parseCoordinate', () => {
  it('parses numeric strings and numbers', () => {
    expect(parseCoordinate('36.8')).toBeCloseTo(36.8);
    expect(parseCoordinate(-85.25)).toBeCloseTo(-85.25);
  });

  it('returns null for empty or invalid values', () => {
    expect(parseCoordinate(null)).toBeNull();
    expect(parseCoordinate(undefined)).toBeNull();
    expect(parseCoordinate('')).toBeNull();
    expect(parseCoordinate('not-a-number')).toBeNull();
  });
});
