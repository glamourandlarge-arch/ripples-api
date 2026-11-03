import { QueryFailedError } from 'typeorm';
import { isUniqueViolation } from './is-unique-violation.js';

function queryError(code: string) {
  return new QueryFailedError(
    'insert',
    [],
    Object.assign(new Error(code), { code }),
  );
}

describe('isUniqueViolation', () => {
  it('matches a postgres unique constraint failure', () => {
    expect(isUniqueViolation(queryError('23505'))).toBe(true);
  });

  it('ignores other failures', () => {
    expect(isUniqueViolation(new Error('down'))).toBe(false);
    expect(isUniqueViolation(queryError('23503'))).toBe(false);
  });
});