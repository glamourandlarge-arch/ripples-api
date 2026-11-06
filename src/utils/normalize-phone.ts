const NG_COUNTRY_CODE = '234';

export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  let national = digits;
  if (digits.startsWith(NG_COUNTRY_CODE) && digits.length >= 13) {
    national = digits.slice(NG_COUNTRY_CODE.length);
  } else if (digits.startsWith('0') && digits.length >= 11) {
    national = digits.slice(1);
  }

  if (!/^[789]\d{9}$/.test(national)) {
    return null;
  }

  return `+${NG_COUNTRY_CODE}${national}`;
}
