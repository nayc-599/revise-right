/**
 * Auth module. No Firebase authentication — app runs without login.
 * Stubbed so callers do not break; no sign-in/sign-out.
 */
import { useUserStore } from '../store/useUserStore';

export function getAuthInstance(): null {
  return null;
}

export async function signIn(): Promise<void> {
  useUserStore.getState().setUser({ id: 'local' });
}

export async function signOut(): Promise<void> {
  useUserStore.getState().setUser({ id: 'local' });
}

export function subscribeToAuthState(): () => void {
  useUserStore.getState().setLoading(false);
  return () => {};
}
