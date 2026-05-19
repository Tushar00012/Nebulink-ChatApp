import { Router, Response } from 'express';
import { z } from 'zod';
import { OtpSession } from '../models/OtpSession';
import { User } from '../models/User';
import { env } from '../config/env';
import { generateOtpCode, hashOtp, compareOtp } from '../utils/otp';
import { signToken } from '../utils/jwt';
import { normalizePhone } from '../utils/phone';
import { assignUniqueUserCode } from '../utils/userCode';
import { formatSelfUser, ensureUserProfile } from '../utils/userResponse';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { checkOtpRateLimit } from '../middleware/rateLimit';

const router = Router();

const authModeSchema = z.enum(['login', 'signup']);

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Username must be at least 2 characters')
  .max(32, 'Username must be at most 32 characters')
  .regex(/^[a-zA-Z0-9 ]+$/, 'Username can only contain letters, numbers, and spaces');

const sendOtpSchema = z.object({
  phone: z.string().min(8).max(20).regex(/^\+?[0-9]+$/),
  mode: authModeSchema,
  name: nameSchema.optional(),
});

const verifySchema = z.object({
  phone: z.string().min(8).max(20).regex(/^\+?[0-9]+$/),
  code: z.string().length(6).regex(/^[0-9]+$/),
  mode: authModeSchema,
  name: nameSchema.optional(),
});

async function createOtpSession(phone: string, ip: string | undefined): Promise<boolean> {
  const rateKey = `${phone}:${ip ?? 'unknown'}`;
  if (!checkOtpRateLimit(rateKey)) {
    return false;
  }

  const code = generateOtpCode();
  const codeHash = await hashOtp(code);
  const expiresAt = new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);

  await OtpSession.deleteMany({ phone });
  await OtpSession.create({ phone, codeHash, expiresAt });

  if (env.NODE_ENV === 'development') {
    console.log(`[OTP] ${phone}: ${code}`);
  }

  return true;
}

router.post('/send-otp', async (req, res: Response) => {
  const parsed = sendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  let phone: string;
  try {
    phone = normalizePhone(parsed.data.phone);
  } catch {
    res.status(400).json({ error: 'Invalid phone number' });
    return;
  }

  const { mode, name } = parsed.data;
  const existingUser = await User.findOne({ phone });

  if (mode === 'login') {
    if (!existingUser) {
      res.status(404).json({ error: 'No account found for this number' });
      return;
    }
  } else {
    if (!name) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }
    if (existingUser) {
      res.status(409).json({ error: 'Phone number already registered' });
      return;
    }
  }

  const sent = await createOtpSession(phone, req.ip);
  if (!sent) {
    res.status(429).json({ error: 'Too many OTP requests. Try again later.' });
    return;
  }

  res.json({ requiresOtp: true, message: 'OTP sent' });
});

router.post('/verify-otp', async (req, res: Response) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  let phone: string;
  try {
    phone = normalizePhone(parsed.data.phone);
  } catch {
    res.status(400).json({ error: 'Invalid phone number' });
    return;
  }

  const { code, mode, name } = parsed.data;

  const session = await OtpSession.findOne({ phone }).sort({ expiresAt: -1 });
  if (!session || session.expiresAt < new Date()) {
    res.status(400).json({ error: 'OTP expired or not found' });
    return;
  }

  const valid = await compareOtp(code, session.codeHash);
  if (!valid) {
    res.status(400).json({ error: 'Invalid OTP' });
    return;
  }

  await OtpSession.deleteMany({ phone });

  const existingUser = await User.findOne({ phone });

  if (mode === 'login') {
    if (!existingUser) {
      res.status(404).json({ error: 'No account found for this number' });
      return;
    }
    const profile = await ensureUserProfile(existingUser);
    const accessToken = signToken({ userId: profile._id.toString(), phone: profile.phone });
    res.json({
      accessToken,
      user: formatSelfUser(profile),
    });
    return;
  }

  if (existingUser) {
    res.status(409).json({ error: 'Phone number already registered' });
    return;
  }

  if (!name) {
    res.status(400).json({ error: 'Username is required for new accounts' });
    return;
  }

  const userCode = await assignUniqueUserCode();
  let user;
  try {
    user = await User.create({ phone, name, userCode });
  } catch (err: unknown) {
    const mongoErr = err as { code?: number };
    if (mongoErr.code === 11000) {
      res.status(409).json({ error: 'Phone number already registered' });
      return;
    }
    throw err;
  }

  const profile = await ensureUserProfile(user);
  const accessToken = signToken({ userId: profile._id.toString(), phone: profile.phone });

  res.json({
    accessToken,
    user: formatSelfUser(profile),
  });
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const profile = await ensureUserProfile(user);
  res.json(formatSelfUser(profile));
});

export default router;
