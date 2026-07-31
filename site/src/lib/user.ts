// The user payload shown in the UI. It's display data (not a credential), so it
// lives in localStorage on the client rather than in the session cookie — see
// user.svelte.ts for the reactive store and the callback route for the handoff.
import type { UserInfoResponse } from "@klaxon/lib/types";

export const USER_KEY = "klaxon_user";

export interface SessionUser {
  uuid: string;
  name: string;
  email: string;
  picture?: string;
  /** Squarelet username, used to build the accounts profile URL. */
  username?: string;
}

/** Reduce a full userinfo response to the small slice the UI needs. */
export function slimUser(user: UserInfoResponse): SessionUser {
  return {
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    picture: user.picture,
    username: user.preferred_username || user.nickname,
  };
}

/**
 * The user's profile page on MuckRock Accounts. Falls back to the accounts home
 * page when the username isn't known — sessions cached before `username` was
 * added to the payload won't have one.
 */
export function profileUrl(accountsHost: string, user: SessionUser | null) {
  const host = accountsHost.replace(/\/$/, "");
  return user?.username ? `${host}/users/${user.username}` : host;
}
