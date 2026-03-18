import { create } from 'zustand';
import type { User } from '../types/auth';

const LS_TOKEN_KEY = 'mowbotfleet.token';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(LS_TOKEN_KEY),
  user: null,

  setAuth: (token, user) => {
    localStorage.setItem(LS_TOKEN_KEY, token);
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem(LS_TOKEN_KEY);
    set({ token: null, user: null });
  },
}));
