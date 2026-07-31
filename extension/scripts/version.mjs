// Bumps the extension version in manifest/base.json — the single source of
// truth for the version both browsers ship (buildManifest merges base into each
// per-browser manifest, and neither overlay sets `version`).
//
// Usage, from extension/:
//   npm run bump -- minor      1.1     -> 1.2
//   npm run bump -- patch      1.1     -> 1.1.1
//   npm run bump -- major      1.1     -> 2.0
//   npm run bump -- 1.4.2      explicit version
//   npm run bump -- minor --dry-run    print the result, write nothing
//
// The store version is NOT semver: Chrome accepts 1–4 dot-separated integers in
// 0–65535 with no leading zeros (https://developer.chrome.com/docs/extensions/reference/manifest/version),
// so a two-part "1.1" is valid and is what we publish. The bumps are therefore
// semver-*shaped* rather than semver-strict:
//   - major -> [n+1, 0]         (drops any patch/build parts)
//   - minor -> [major, n+1]     (drops any patch/build parts)
//   - patch -> [major, minor, n+1]  (appends .1 to a two-part version)
// Both stores require the new version to sort strictly above the published one,
// so the script refuses any bump that isn't an increase.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE_MANIFEST = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "manifest",
  "base.json",
);

const RELEASE_TYPES = ["major", "minor", "patch"];
const MAX_PART = 65535;

/**
 * Splits a store version into its numeric parts, rejecting anything the stores
 * would reject (wrong part count, non-integers, leading zeros, out of range).
 * @param {string} version
 * @returns {number[]}
 */
export function parseVersion(version) {
  const parts = String(version).split(".");
  if (parts.length < 1 || parts.length > 4) {
    throw new Error(
      `Invalid version "${version}" — needs 1 to 4 dot-separated parts.`,
    );
  }
  return parts.map((part) => {
    // Leading zeros ("1.01") are rejected by the Chrome Web Store, so catch
    // them here rather than at upload time.
    if (!/^(0|[1-9]\d*)$/.test(part)) {
      throw new Error(
        `Invalid version "${version}" — "${part}" must be a non-negative integer without leading zeros.`,
      );
    }
    const n = Number(part);
    if (n > MAX_PART) {
      throw new Error(
        `Invalid version "${version}" — "${part}" exceeds the ${MAX_PART} maximum for a version part.`,
      );
    }
    return n;
  });
}

/**
 * Orders two versions the way the stores do: part by part, with a missing part
 * treated as 0 (so "1.1" and "1.1.0" compare equal).
 * @param {string} a
 * @param {string} b
 * @returns {number} negative if a < b, 0 if equal, positive if a > b
 */
export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * @param {string} current
 * @param {"major" | "minor" | "patch"} release
 * @returns {string}
 */
export function bumpVersion(current, release) {
  const [major = 0, minor = 0, patch = 0] = parseVersion(current);
  switch (release) {
    case "major":
      return `${major + 1}.0`;
    case "minor":
      return `${major}.${minor + 1}`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(
        `Unknown release type "${release}" — expected ${RELEASE_TYPES.join(", ")} or an explicit version.`,
      );
  }
}

/**
 * @param {string} target release type or explicit version
 * @param {{ dryRun?: boolean }} [options]
 */
export function applyBump(target, { dryRun = false } = {}) {
  // Read as text so the write below can keep the file byte-identical apart from
  // the version line (the manifest fragments are prettier-formatted, 2-space).
  const source = readFileSync(BASE_MANIFEST, "utf8");
  const manifest = JSON.parse(source);
  const current = manifest.version;
  if (!current) {
    throw new Error(`No "version" found in ${BASE_MANIFEST}.`);
  }
  parseVersion(current);

  const next = RELEASE_TYPES.includes(target)
    ? bumpVersion(current, target)
    : String(target);
  parseVersion(next);

  if (compareVersions(next, current) <= 0) {
    throw new Error(
      `Refusing to set version ${next} — it is not greater than the current ${current}. ` +
        `Both stores require each upload to increase the version.`,
    );
  }

  if (!dryRun) {
    // Replace only the version value, so the rest of the file (key order,
    // formatting, the Chrome `key`) is untouched.
    const updated = source.replace(
      /("version"\s*:\s*")[^"]*(")/,
      `$1${next}$2`,
    );
    if (updated === source) {
      throw new Error(
        `Could not rewrite the "version" field in ${BASE_MANIFEST}.`,
      );
    }
    writeFileSync(BASE_MANIFEST, updated);
  }
  return { current, next };
}

// CLI. Guarded so the helpers above stay importable from tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const target = args.find((arg) => !arg.startsWith("-"));

  if (!target) {
    console.error(
      `Usage: npm run bump -- <${RELEASE_TYPES.join("|")}|x.y[.z]> [--dry-run]`,
    );
    process.exit(1);
  }

  try {
    const { current, next } = applyBump(target, { dryRun });
    console.log(
      `${dryRun ? "[dry run] " : ""}manifest version ${current} -> ${next}`,
    );
    if (!dryRun) {
      console.log("Rebuild (npm run build) to pick it up in build/<browser>/.");
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
