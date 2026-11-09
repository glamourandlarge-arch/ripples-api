/** Loose E.164: + and 8–15 digits total after country code rules. */
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function normalizeE164(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (E164_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  const candidate = trimmed.startsWith('+') ? `+${digits}` : `+${digits}`;
  return E164_PATTERN.test(candidate) ? candidate : null;
}

export function isE164Phone(value: unknown): boolean {
  return typeof value === 'string' && normalizeE164(value) !== null;
}
