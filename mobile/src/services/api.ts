import { API_URL } from '../config';
import { ChatListItem, Message, PublicUser, User } from '../types';
import { getToken, clearToken } from './token';

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

export type AuthMode = 'login' | 'signup';

export type SendOtpResponse = { requiresOtp: true; message?: string };

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: () => void) {
  onUnauthorized = handler;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth) {
    await clearToken();
    onUnauthorized?.();
    throw new Error('Unauthorized');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? 'Request failed');
  }
  return data as T;
}

export const api = {
  auth: {
    loginSendOtp(phone: string): Promise<SendOtpResponse> {
      return request('/auth/send-otp', {
        method: 'POST',
        body: { phone, mode: 'login' },
        auth: false,
      });
    },

    signupSendOtp(phone: string, name: string): Promise<SendOtpResponse> {
      return request('/auth/send-otp', {
        method: 'POST',
        body: { phone, name, mode: 'signup' },
        auth: false,
      });
    },

    verifyOtp(
      phone: string,
      code: string,
      options: { mode: AuthMode; name?: string }
    ): Promise<{ accessToken: string; user: User }> {
      return request('/auth/verify-otp', {
        method: 'POST',
        body: { phone, code, mode: options.mode, name: options.name },
        auth: false,
      });
    },

    getMe(): Promise<User> {
      return request('/auth/me');
    },
  },

  users: {
    search(q: string): Promise<PublicUser[]> {
      return request(`/users/search?q=${encodeURIComponent(q)}`);
    },
  },

  chats: {
    list(): Promise<ChatListItem[]> {
      return request('/chats');
    },

    create(participantId: string): Promise<{ _id: string }> {
      return request('/chats', {
        method: 'POST',
        body: { participantId },
      });
    },

    hide(chatId: string): Promise<void> {
      return request(`/chats/${chatId}`, {
        method: 'DELETE',
      });
    },

    messages: {
      list(
        chatId: string,
        params?: { limit?: number; before?: string }
      ): Promise<Message[]> {
        const search = new URLSearchParams();
        if (params?.limit) search.set('limit', String(params.limit));
        if (params?.before) search.set('before', params.before);
        const qs = search.toString();
        return request(`/chats/${chatId}/messages${qs ? `?${qs}` : ''}`);
      },

      send(
        chatId: string,
        content: string,
        clientMessageId?: string
      ): Promise<Message> {
        return request(`/chats/${chatId}/messages`, {
          method: 'POST',
          body: { content, clientMessageId },
        });
      },

      delete(
        chatId: string,
        messageId: string,
        scope: 'me' | 'everyone'
      ): Promise<void> {
        return request(`/chats/${chatId}/messages/${messageId}?scope=${scope}`, {
          method: 'DELETE',
        });
      },
    },
  },
};
