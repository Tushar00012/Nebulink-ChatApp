const otpAttempts = new Map<string, { count: number; resetAt: number }>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 60 * 1000;

export function checkOtpRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = otpAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    otpAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return false;
  }
  entry.count += 1;
  return true;
}
