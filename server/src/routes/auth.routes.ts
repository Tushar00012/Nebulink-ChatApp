import { Router, Response } from 'express';
import { z } from 'zod';
import { OtpSession } from '../models/OtpSession';
import { User } from '../models/User';
import { env } from '../config/env';
import { generateOtpCode, hashOtp, compareOtp } from '../utils/otp';
import { signToken } from '../utils/jwt';
import { normalizePhone } from '../utils/phone';
import { assignUniqueUserCode } from '../utils/userCode';
import { formatSelfUser, ensureUserProfile, applyLoginName } from '../utils/userResponse';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { checkOtpRateLimit } from '../middleware/rateLimit';

const router = Router();

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Username must be at least 2 characters')
  .max(32, 'Username must be at most 32 characters')
  .regex(/^[a-zA-Z0-9 ]+$/, 'Username can only contain letters, numbers, and spaces');

const phoneSchema = z.object({
  phone: z.string().min(8).max(20).regex(/^\+?[0-9]+$/),
  name: nameSchema.optional(),
});

const verifySchema = z.object({
  phone: z.string().min(8).max(20).regex(/^\+?[0-9]+$/),
  code: z.string().length(6).regex(/^[0-9]+$/),
  name: nameSchema.optional(),
});

router.post('/send-otp', async (req, res: Response) => {
  const parsed = phoneSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid phone number' });
    return;
  }

  let phone: string;
  try {
    phone = normalizePhone(parsed.data.phone);
  } catch {
    res.status(400).json({ error: 'Invalid phone number' });
    return;
  }

  const existingUser = await User.findOne({ phone });
  if (existingUser) {
    const user = await applyLoginName(existingUser, parsed.data.name);
    const accessToken = signToken({
      userId: user._id.toString(),
      phone: user.phone,
    });
    res.json({
      requiresOtp: false,
      accessToken,
      user: formatSelfUser(user),
    });
    return;
  }

  const rateKey = `${phone}:${req.ip ?? 'unknown'}`;
  if (!checkOtpRateLimit(rateKey)) {
    res.status(429).json({ error: 'Too many OTP requests. Try again later.' });
    return;
  }

  const code = generateOtpCode();
  const codeHash = await hashOtp(code);
  const expiresAt = new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);

  await OtpSession.deleteMany({ phone });
  await OtpSession.create({ phone, codeHash, expiresAt });

  if (env.NODE_ENV === 'development') {
    console.log(`[OTP] ${phone}: ${code}`);
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

  const { code, name } = parsed.data;

  const existingUser = await User.findOne({ phone });
  if (existingUser) {
    const user = await applyLoginName(existingUser, name);
    const accessToken = signToken({
      userId: user._id.toString(),
      phone: user.phone,
    });
    res.json({
      accessToken,
      user: formatSelfUser(user),
    });
    return;
  }

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

  if (!name) {
    res.status(400).json({ error: 'Username is required for new accounts' });
    return;
  }

  await OtpSession.deleteMany({ phone });

  let user = await User.findOne({ phone });
  if (!user) {
    const userCode = await assignUniqueUserCode();
    try {
      user = await User.create({ phone, name, userCode });
    } catch (err: unknown) {
      const mongoErr = err as { code?: number };
      if (mongoErr.code === 11000) {
        user = await User.findOne({ phone });
      }
      if (!user) throw err;
    }
  }

  user.name = name;
  await user.save();
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
