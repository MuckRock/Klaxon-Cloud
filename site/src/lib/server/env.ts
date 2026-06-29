// Server-side configuration, read at runtime from the Worker environment
// (Cloudflare secrets/vars in production, `.env` in dev) via $env/dynamic/private.
import { env } from "$env/dynamic/private";

const DEFAULT_SCOPES = "openid profile email uuid organizations";

export interface ServerConfig {
  accountsHost: string;
  clientId: string;
  scopes: string;
  apiUrl: string;
  klaxonId: string;
  publicOrigin: string;
  sessionSecret: string;
}

/**
 * Resolve the full server configuration, throwing a clear error if anything
 * required is missing. Use from auth/API code paths that genuinely need it —
 * not from the request hook, which must tolerate an unconfigured deploy so the
 * signed-out marketing page still renders.
 */
export function requireConfig(): ServerConfig {
  const get = (key: string): string => {
    const value = env[key];
    if (!value) {
      throw new Error(
        `Missing required environment variable ${key} — see site/.env.example.`,
      );
    }
    return value;
  };

  return {
    accountsHost: get("MUCKROCK_ACCOUNTS_HOST"),
    clientId: get("MUCKROCK_WEB_CLIENT_ID"),
    scopes: env.MUCKROCK_SCOPES || DEFAULT_SCOPES,
    apiUrl: get("MUCKROCK_DOCUMENTCLOUD_API"),
    klaxonId: get("MUCKROCK_KLAXON_ID"),
    publicOrigin: get("MUCKROCK_PUBLIC_ORIGIN"),
    sessionSecret: get("MUCKROCK_SESSION_SECRET"),
  };
}

/** The OAuth redirect URI for this deploy — must match the OIDC client registration. */
export function redirectUri(): string {
  return `${requireConfig().publicOrigin.replace(/\/$/, "")}/auth/callback`;
}

/** The session-encryption secret, or null when the deploy isn't configured for auth. */
export function sessionSecret(): string | null {
  return env.MUCKROCK_SESSION_SECRET || null;
}
