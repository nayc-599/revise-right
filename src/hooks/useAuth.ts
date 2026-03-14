/**
 * Auth hook. No Firebase authentication — app runs without login.
 * Returns a stable interface so components can check "user" without breaking.
 */
import { useUserStore } from '../store/useUserStore';

export function useAuth() {
  const { user, isLoading } = useUserStore();

  return {
    user,
    isLoading,
    signIn: async () => {},
    signOut: async () => {
      useUserStore.getState().setUser({ id: 'local' });
    },
  };
}