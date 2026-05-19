import { apiRequest } from './api';
import { User } from '../types';

export type LoginPhoneResponse =
  | { requiresOtp: false; accessToken: string; user: User }
  | { requiresOtp: true; message?: string };

export async function loginWithPhone(phone: string, name: string): Promise<LoginPhoneResponse> {
  return apiRequest('/auth/send-otp', {
    method: 'POST',
    body: { phone, name },
    auth: false,
  });
}

export async function verifyOtp(
  phone: string,
  code: string,
  name: string
): Promise<{ accessToken: string; user: User }> {
  return apiRequest('/auth/verify-otp', {
    method: 'POST',
    body: { phone, code, name },
    auth: false,
  });
}

export async function getMe(): Promise<User> {
  return apiRequest('/auth/me');
}
