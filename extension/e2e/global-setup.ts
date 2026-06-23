import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const extensionRoot = resolve(here, "..");

// Build the Chrome bundles (content.js + background.js) into build/chrome/
// before the suite runs, so e2e always exercises the current source. e2e is
// Chromium-only, so only the Chrome build is needed. The build bakes MUCKROCK_*
// env from .env — values just need to be parseable absolute URLs; the API mocks
// match on path, not host.
export default function globalSetup() {
  if (!existsSync(resolve(extensionRoot, ".env"))) {
    throw new Error(
      "e2e build needs extension/.env (MUCKROCK_* values are baked in at build time). Copy .env.example and fill it in.",
    );
  }
  // E2E_GRANT_HOST promotes optional host access to install-time host_permissions
  // so the unpacked test extension is granted up front — automation can't drive
  // the native optional-permission prompt that requestWatch() triggers in
  // production. With the origin already granted, requestWatch() resolves true
  // without a prompt, so the create/view/edit flows run as a user's would.
  execSync("npm run build:chrome", {
    cwd: extensionRoot,
    stdio: "inherit",
    env: { ...process.env, E2E_GRANT_HOST: "true" },
  });
}
