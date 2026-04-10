import { create } from 'zustand';
import {
  clearPersistedSession,
  getStoredAccessToken,
  getStoredCurrentUser,
  persistSession,
} from '@/lib/api';
import type { UserProfile } from '@/types/api';

interface UserState {
  accessToken: string | null;
  currentUser: UserProfile | null;
  setSession: (token: string, user: UserProfile, remember?: boolean) => void;
  hydrateSession: () => void;
  clearSession: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  accessToken: null,
  currentUser: null,
  setSession: (token, user, remember = true) =>
    set(() => {
      persistSession(token, user, remember);
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
      const storedUser = getStoredCurrentUser();

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
