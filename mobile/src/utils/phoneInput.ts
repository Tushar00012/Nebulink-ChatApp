export const COUNTRY_CODE = '+91';
export const PHONE_DIGITS_LENGTH = 10;

export function toFullPhone(digits: string): string {
  return `${COUNTRY_CODE}${digits}`;
}

export function sanitizeDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, PHONE_DIGITS_LENGTH);
}

export function sanitizeUsername(value: string): string {
  return value.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 32);
}

export function isValidIndianPhone(digits: string): boolean {
  return digits.length === PHONE_DIGITS_LENGTH && /^[6-9]\d{9}$/.test(digits);
}

export function isValidUsername(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 32 && /^[a-zA-Z0-9 ]+$/.test(trimmed);
}
