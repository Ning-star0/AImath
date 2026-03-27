import { create } from 'zustand';
import { clearPersistedSession, getStoredAccessToken, persistSession } from '@/lib/api';
import type { UserProfile } from '@/types/api';

interface UserState {
  accessToken: string | null;
  currentUser: UserProfile | null;
  setSession: (token: string, user: UserProfile) => void;
  hydrateSession: () => void;
  clearSession: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  accessToken: null,
  currentUser: null,
  setSession: (token, user) =>
    set(() => {
      persistSession(token, user);
      return {
        accessToken: token,
        currentUser: user,
      };
    }),
  hydrateSession: () =>
    set(() => {
      if (typeof window === 'undefined') {
        return {
          accessToken: null,
          currentUser: null,
        };
      }

      const accessToken = getStoredAccessToken();
      const storedUser = window.localStorage.getItem('currentUser');

      return {
        accessToken,
        currentUser: storedUser ? (JSON.parse(storedUser) as UserProfile) : null,
      };
    }),
  clearSession: () =>
    set(() => {
      clearPersistedSession();
      return {
        accessToken: null,
        currentUser: null,
      };
    }),
}));
