import type { ValidationError } from 'class-validator';

export function flattenValidationErrors(
  errors: ValidationError[],
  parent = '',
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const error of errors) {
    const field = parent ? `${parent}.${error.property}` : error.property;

    if (error.constraints) {
      result[field] = Object.values(error.constraints);
    }

    if (error.children && error.children.length > 0) {
      Object.assign(result, flattenValidationErrors(error.children, field));
    }
  }

  return result;
}
