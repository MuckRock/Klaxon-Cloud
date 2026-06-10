import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const extensionRoot = resolve(here, "..");

// Build both bundles (content.js + background.js) into build/ before the suite
// runs, so e2e always exercises the current source. Reuses the existing `build`
// script. The build bakes MUCKROCK_* env from .env — values just need to be
// parseable absolute URLs; the API mocks match on path, not host.
export default function globalSetup() {
  if (!existsSync(resolve(extensionRoot, ".env"))) {
    throw new Error(
      "e2e build needs extension/.env (MUCKROCK_* values are baked in at build time). Copy .env.example and fill it in.",
    );
  }
  execSync("npm run build", { cwd: extensionRoot, stdio: "inherit" });
}
