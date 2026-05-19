import { User } from '../models/User';

const CODE_LENGTH = 8;
const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const MAX_ATTEMPTS = 20;

export function generateUserCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export async function assignUniqueUserCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const userCode = generateUserCode();
    const existing = await User.findOne({ userCode }).select('_id').lean();
    if (!existing) {
      return userCode;
    }
  }
  throw new Error('Failed to generate unique user code');
}
