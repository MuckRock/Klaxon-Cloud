/** The User Guide's Klaxon Cloud page — the first place to look. */
export const HELP_GUIDE_URL =
  "https://help.muckrock.com/Klaxon-Cloud-3acf8892696380ccabeeff596511a6a0";

/** The FAQ section of that page (a block anchor within it). */
export const HELP_FAQ_URL = `${HELP_GUIDE_URL}#3acf8892696380028eaaff2b864751b2`;

/** Last resort: a human. */
export const SUPPORT_EMAIL = "help@muckrock.com";

/** In the future, we could use the ZenDesk API to create new tickets.
 *  For now, sending an email is low-effort and high-impact. */

/** Support routes by subject line, so every message carries a product tag. */
export const SUPPORT_SUBJECT = "[Klaxon Cloud]";

/** The signed-in user, as much of them as the sender knows. */
export interface SupportUser {
  name?: string | null;
  email?: string | null;
  username?: string | null;
  uuid?: string | null;
}

export interface SupportContext {
  /** The signed-in user; omit (or pass null) when nobody is signed in. */
  user?: SupportUser | null;
  /** Which Klaxon this is, e.g. "Web app" or "Browser extension 1.1". */
  client?: string;
  /**
   * Extra labelled lines for the details block, e.g. `{ Page: location.href }`.
   * Empty and missing values are dropped, so callers can pass them unguarded.
   */
  details?: Record<string, string | null | undefined>;
}

const PROMPT =
  "Tell us what's going wrong, and include a link to the alert or page if you have one.";

const PREAMBLE =
  "--- Sent from Klaxon Cloud. These details help us find your account. ---";

/**
 * The prefilled body of a support email: a prompt for the user, blank space to
 * write in, and a block of account details we'd otherwise have to ask for.
 */
export function supportBody({
  user = null,
  client,
  details,
}: SupportContext = {}): string {
  const lines: string[] = [];

  if (client) lines.push(`Klaxon: ${client}`);

  const identity: [string, string | null | undefined][] = [
    ["Name", user?.name],
    ["Email", user?.email],
    ["Username", user?.username],
    ["Account ID", user?.uuid],
  ];
  const known = identity.filter(([, value]) => Boolean(value));

  // An empty user object is as good as no user: say so rather than sending a
  // details block that silently omits who's asking.
  if (known.length === 0) lines.push("Signed in: no");
  else for (const [label, value] of known) lines.push(`${label}: ${value}`);

  for (const [label, value] of Object.entries(details ?? {})) {
    if (value) lines.push(`${label}: ${value}`);
  }

  // Two blank lines: the cursor lands in the first, above the details block.
  return [PROMPT, "", "", "", PREAMBLE, ...lines].join("\n");
}

/**
 * A `mailto:` URL for emailing support, tagged subject and prefilled body.
 *
 * Encoded by hand rather than with `URLSearchParams`, which spells a space as
 * "+" — legal in a query string, but mail clients drop it into the subject and
 * body verbatim.
 */
export function supportMailto(context: SupportContext = {}): string {
  const subject = encodeURIComponent(SUPPORT_SUBJECT);
  const body = encodeURIComponent(supportBody(context));
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}
