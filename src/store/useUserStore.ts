/**
 * User store. No Firebase auth: sign in/out is local state only.
 */
import { create } from 'zustand';

interface UserStore {
  user: { id: string } | null;
  isLoading: boolean;
  setUser: (user: { id: string } | null) => void;
  setLoading: (loading: boolean) => void;
  signIn: () => void;
  signOut: () => void;
}

export const LOCAL_USER_ID = 'local';

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isLoading: false,

  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),

  signIn: () => set({ user: { id: LOCAL_USER_ID } }),
  signOut: () => set({ user: null }),
}));
