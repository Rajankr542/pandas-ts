// Stage the published package contents before release.
// Exported constants are imported by scripts/release.mjs.
// When run directly (node scripts/stage-package.mjs) it validates and
// auto-fixes the package.json metadata fields required for publishing.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Public source repository. */
export const REPO_URL = "https://github.com/Rajankr542/pandas-ts";
/** Raw file host for images in the npm README. */
export const RAW_URL = "https://raw.githubusercontent.com/Rajankr542/pandas-ts/main";
/** Hosted API reference and npm homepage. */
export const DOCS_URL = "https://pandas-ts.cyfora.in";

// Only run the validation logic when executed directly (not when imported).
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const pkgJsonPath = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));

  const checks = {
    homepage: DOCS_URL,
    "repository.url": `git+${REPO_URL}.git`,
    "bugs.url": `${REPO_URL}/issues`,
  };

  let fixed = false;
  for (const [key, value] of Object.entries(checks)) {
    const parts = key.split(".");
    const got = parts.reduce((o, k) => o?.[k], pkg);
    if (got !== value) {
      if (parts.length === 1) {
        pkg[key] = value;
      } else {
        pkg[parts[0]] = pkg[parts[0]] ?? {};
        pkg[parts[0]][parts[1]] = value;
      }
      console.log(`  Fixed package.json ${key}: ${JSON.stringify(value)}`);
      fixed = true;
    }
  }
  if (fixed) {
    writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + "\n");
  }

  console.log(`stage-package: ${pkg.name}@${pkg.version} ready for publishing`);
  console.log(`  homepage:   ${pkg.homepage}`);
  console.log(`  repository: ${pkg.repository?.url}`);
}
