import { IUser } from '../models/User';
import { assignUniqueUserCode } from './userCode';

type UserDoc = Pick<IUser, '_id' | 'phone' | 'name' | 'userCode' | 'avatarUrl'>;

export function isPlaceholderName(name: string, userCode: string): boolean {
  return name === `User${userCode.slice(-4)}`;
}

export function formatSelfUser(user: UserDoc) {
  return {
    _id: user._id.toString(),
    phone: user.phone,
    name: user.name,
    userCode: user.userCode,
    avatarUrl: user.avatarUrl,
  };
}

export function formatPublicUser(user: Pick<UserDoc, '_id' | 'name' | 'userCode' | 'avatarUrl'>) {
  return {
    _id: user._id.toString(),
    name: user.name,
    userCode: user.userCode,
    avatarUrl: user.avatarUrl,
  };
}

export async function applyLoginName(user: IUser, name?: string): Promise<IUser> {
  const profile = await ensureUserProfile(user);
  const trimmed = name?.trim();
  if (trimmed && trimmed.length >= 2) {
    profile.name = trimmed;
    await profile.save();
  }
  return profile;
}

export async function ensureUserProfile(user: IUser): Promise<IUser> {
  let updated = false;

  if (!user.userCode) {
    user.userCode = await assignUniqueUserCode();
    updated = true;
  }

  if (!user.name) {
    user.name = `User${user.userCode.slice(-4)}`;
    updated = true;
  }

  if (updated) {
    await user.save();
  }

  return user;
}
