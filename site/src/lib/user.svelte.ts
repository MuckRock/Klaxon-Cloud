// Reactive holder for the signed-in user, hydrated from localStorage. The
// server only knows whether a session exists (the auth cookie); the user's
// name/email/avatar are kept client-side, so the UI reads them from here.
import { browser } from "$app/environment";
import { USER_KEY, type SessionUser } from "./user";

export const userState = $state<{ user: SessionUser | null }>({ user: null });

/** Load the cached user from localStorage into the reactive store. */
export function loadUser(): void {
  if (!browser) return;
  try {
    const raw = localStorage.getItem(USER_KEY);
    userState.user = raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    userState.user = null;
  }
}

/** Forget the cached user (on logout, or when the server reports no session). */
export function clearUser(): void {
  userState.user = null;
  if (!browser) return;
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore storage failures
  }
}
