import { create } from 'zustand';
import { User } from '../types';
import { getToken, setToken, clearToken } from '../services/token';
import { getMe } from '../services/auth';
import { connectSocket, disconnectSocket } from '../services/socket';
import { useChatStore } from './chatStore';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
  setAuth: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const token = await getToken();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      const user = await getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      await clearToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setAuth: async (token, user) => {
    await setToken(token);
    set({ user, isAuthenticated: true, isLoading: false });
    connectSocket().catch(() => {});
  },

  logout: async () => {
    disconnectSocket();
    useChatStore.getState().reset();
    await clearToken();
    set({ user: null, isAuthenticated: false });
  },
}));
