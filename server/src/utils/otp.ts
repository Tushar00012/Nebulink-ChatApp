import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export function generateOtpCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function hashOtp(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function compareOtp(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}
