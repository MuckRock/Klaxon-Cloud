# Klaxon Cloud — web app

The web front end for [Klaxon](https://github.com/MuckRock/Klaxon), MuckRock's tool for monitoring web pages for newsworthy changes. It's a [SvelteKit](https://svelte.dev/docs/kit) app deployed to Cloudflare Workers, and it talks to the same DocumentCloud Add-On backend and [MuckRock Accounts](https://accounts.muckrock.com) (Squarelet) identity provider as the browser extension.

This package lives in the `/site` workspace of the [Klaxon-Cloud](https://github.com/MuckRock/Klaxon-Cloud) monorepo and shares pure OIDC/API helpers with the extension through the `@klaxon/lib` workspace package.

## How authentication works

Users sign in through **MuckRock Accounts (Squarelet)** over OIDC with PKCE. Unlike the browser extension, the entire handshake runs **server-side** in SvelteKit — browser JavaScript can't reach Squarelet or DocumentCloud directly because those endpoints send no CORS headers.

The flow:

1. `GET /auth/login` generates a PKCE verifier + state, stashes them in a short-lived cookie, and redirects the browser to Squarelet's authorize page. (`?create=1` opens the signup page first; `?returnTo=` controls where the user lands afterward.)
2. Squarelet redirects back to `GET /auth/callback`, which verifies the state, exchanges the authorization code for OIDC tokens, mints a DocumentCloud JWT, and seals both into an encrypted, httpOnly session cookie.
3. The request hook (`src/hooks.server.ts`) reads that cookie on every request, refreshes the DocumentCloud JWT when it expires, and guards routes under the `(app)` group — signed-out visitors get bounced to `/auth/login`.
4. `GET /auth/logout` clears the session and sends the user to Squarelet's end-session endpoint.

The session secrets stay in the httpOnly cookie; only a slim user payload is handed to the client (in `localStorage`) for rendering.

## Configuring your Accounts host

To authenticate against an Accounts (Squarelet) host you need to **register an OIDC client for the web app** and then point the app's environment at it.

### 1. Register an OIDC client on Squarelet

Create a client that is **separate** from the browser extension's — it has its own redirect URIs.

- **Client type:** Public (PKCE, **no client secret**).
- **Redirect URI:** `${MUCKROCK_PUBLIC_ORIGIN}/auth/callback`, registered verbatim. For local dev that's `http://localhost:5173/auth/callback`; in production something like `https://klaxon.muckrock.com/auth/callback`.
- **Post-logout redirect URI:** `${MUCKROCK_PUBLIC_ORIGIN}/` (the app's home page).
- **Requested scopes:** `openid profile email uuid organizations`.
- **First-party scope (required):** the client's own **Scopes** field in Squarelet's admin must include `read_auth_token` — e.g. `read_user read_organization read_auth_token`. This is what marks the client as "first party" and lets it exchange an OIDC token for a DocumentCloud JWT. Without it, sign-in fails at the JWT-exchange step with `403 {"error":"first party clients only"}`. (This is the client's _configured_ scope set, separate from the scopes the app requests at sign-in above.)

Note the generated **client id** — that's `MUCKROCK_WEB_CLIENT_ID` below.

> The `redirect_uri` the app sends is derived from `MUCKROCK_PUBLIC_ORIGIN` (scheme + host, no trailing slash) and must match the registration exactly, or Squarelet will reject the sign-in.

### 2. Set the environment

Copy `.env.example` to `.env` and fill it in:

```sh
cp .env.example .env
```

| Variable                     | What it is                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `MUCKROCK_ACCOUNTS_HOST`     | The Squarelet OIDC host, e.g. `https://dev.squarelet.com/` or `https://accounts.muckrock.com/`.                                  |
| `MUCKROCK_WEB_CLIENT_ID`     | The public OIDC client id registered in step 1.                                                                                  |
| `MUCKROCK_SCOPES`            | OAuth scopes (defaults to `openid profile email uuid organizations`).                                                            |
| `MUCKROCK_DOCUMENTCLOUD_API` | DocumentCloud API base, e.g. `https://api.www.documentcloud.org/api/`.                                                           |
| `MUCKROCK_KLAXON_ID`         | The Klaxon add-on's numeric id in DocumentCloud (differs per environment).                                                       |
| `MUCKROCK_PUBLIC_ORIGIN`     | This app's canonical origin, e.g. `http://localhost:5173` in dev. Used to build the redirect URI.                                |
| `MUCKROCK_SESSION_SECRET`    | Key used to encrypt the session cookie (A256GCM). Generate with `openssl rand -base64 32`. Rotating it invalidates all sessions. |

These are read at **runtime** via `$env/dynamic/private`, not baked in at build time. In production set them as Cloudflare Worker secrets/vars:

```sh
wrangler secret put MUCKROCK_SESSION_SECRET
wrangler secret put MUCKROCK_WEB_CLIENT_ID
# …and so on for each value
```

## Developing

From the repo root, install dependencies once (npm workspaces wires up `@klaxon/lib`):

```sh
npm install
```

Then run the dev server from this directory:

```sh
npm run dev

# or open it in a new browser tab
npm run dev -- --open
```

The app serves on `http://localhost:5173` by default — keep `MUCKROCK_PUBLIC_ORIGIN` and the registered redirect URI in sync with that.

## Building & deploying

The app uses [`@sveltejs/adapter-cloudflare`](https://svelte.dev/docs/kit/adapter-cloudflare) and is hosted on Cloudflare Workers (configured inline in `vite.config.ts`).

```sh
npm run build      # production build
npm run preview    # preview the build locally
```

Deploy with Wrangler / Cloudflare, ensuring every variable from the table above is set as a Worker secret or var.

## Quality checks

```sh
npm run check      # svelte-check (types)
npm run lint       # prettier + eslint
npm run format     # prettier --write
npm run test       # unit (vitest) + e2e (playwright)
```
