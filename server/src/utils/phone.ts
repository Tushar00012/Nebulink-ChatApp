export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8) {
    throw new Error('Invalid phone number');
  }
  return `+${digits}`;
}
