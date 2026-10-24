// Release script for pandas-ts.
//
// Usage:
//   npm run release                  # auto-picks patch/minor/major from stdin
//   npm run release patch            # (or minor, major)
//   npm run release:patch            # same as above
//   npm run release -- --dry-run     # builds and packs but does NOT publish
//   npm run release -- --push        # publish + push + create GitHub Release
//   npm run release -- --otp 123456  # supply 2FA code up-front
//
// Steps:
//   1. Check git working tree is clean
//   2. Check npm authentication (opens browser login if needed)
//   3. Pick the new version (bumps if already published on npm)
//   4. Build (tsc) + typecheck + test
//   5. Pack + verify the tarball
//   6. npm publish
//   7. Commit version bump + git tag (+ push + GitHub Release if --push)
//
// On failure the version bump in package.json is rolled back automatically.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { DOCS_URL, REPO_URL } from "./stage-package.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkgJsonPath = join(root, "package.json");

const args = process.argv.slice(2);
const opt = (name) => args.includes(name);
const bumpType = args.find((a) => ["patch", "minor", "major"].includes(a)) ?? null;
const dryRun = opt("--dry-run");
const otpIdx = args.indexOf("--otp");
const otpArg = otpIdx >= 0 ? args[otpIdx + 1] : null;

function run(cmd, cmdArgs, opts = {}) {
  console.log(`\n$ ${cmd} ${cmdArgs.join(" ")}`);
  execFileSync(cmd, cmdArgs, { stdio: "inherit", cwd: root, ...opts });
}
function capture(cmd, cmdArgs, opts = {}) {
  return execFileSync(cmd, cmdArgs, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  }).trim();
}
function tryCapture(cmd, cmdArgs) {
  try {
    return capture(cmd, cmdArgs);
  } catch {
    return null;
  }
}
function bump(version, type) {
  const [maj, min, pat] = version.split(".").map(Number);
  if (type === "major") return `${maj + 1}.0.0`;
  if (type === "minor") return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}
function step(title) {
  console.log(`\n━━ ${title} ━━`);
}

// Validate the packed tarball before publishing.
function checkTarball(packed, pkgJson) {
  const has = (p) => packed.files.some((f) => f.path === p);
  if (packed.name !== pkgJson.name)
    throw new Error(`packed name ${packed.name}, expected ${pkgJson.name}`);
  for (const f of ["README.md", "LICENSE"]) {
    if (!has(f)) throw new Error(`tarball is missing ${f}`);
  }
  const maps = packed.files.filter((f) => f.path.endsWith(".map"));
  if (maps.length)
    throw new Error(`tarball contains source maps: ${maps.map((f) => f.path).join(", ")}`);
  const want = {
    homepage: DOCS_URL,
    "repository.url": `git+${REPO_URL}.git`,
    "bugs.url": `${REPO_URL}/issues`,
  };
  for (const [key, value] of Object.entries(want)) {
    const got = key.split(".").reduce((o, k) => o?.[k], pkgJson);
    if (got !== value)
      throw new Error(
        `package.json ${key} is ${JSON.stringify(got)}, expected ${JSON.stringify(value)}`,
      );
  }
}

// ── 1. Clean git tree ──────────────────────────────────────────────────────
step("Checking git working tree");
const dirty = capture("git", ["status", "--porcelain"]);
if (dirty && !opt("--allow-dirty")) {
  throw new Error(
    `Working tree is not clean. Commit or stash first (or pass --allow-dirty):\n${dirty}`,
  );
}

// ── 2. npm authentication ──────────────────────────────────────────────────
step("Checking npm authentication");
let user = tryCapture("npm", ["whoami"]);
if (!user) {
  console.log("Not logged in to npm. Opening the browser for npm login...");
  run("npm", ["login", "--auth-type=web"]);
  user = tryCapture("npm", ["whoami"]);
  if (!user) throw new Error("npm login did not succeed.");
}
console.log(`Logged in to npm as: ${user}`);

// ── 3. Pick version ────────────────────────────────────────────────────────
step("Choosing version");
const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
const publishedRaw = tryCapture("npm", ["view", pkg.name, "versions", "--json"]) ?? "[]";
const publishedList = (() => {
  const p = JSON.parse(publishedRaw);
  return Array.isArray(p) ? p : [p];
})();

let finalBumpType = bumpType;
if (!finalBumpType) {
  if (publishedList.includes(pkg.version)) {
    // Interactive: ask the user
    if (process.stdin.isTTY) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const answer = await rl.question(
        `\nCurrent version ${pkg.version} is already on npm.\nBump type [patch/minor/major] (default: patch): `,
      );
      rl.close();
      finalBumpType = ["patch", "minor", "major"].includes(answer.trim()) ? answer.trim() : "patch";
    } else {
      finalBumpType = "patch";
    }
  } else {
    finalBumpType = "patch"; // won't need to bump if version is fresh
  }
}

let version = pkg.version;
while (publishedList.includes(version)) version = bump(version, finalBumpType);
const originalJson = readFileSync(pkgJsonPath, "utf8");
if (version !== pkg.version) {
  pkg.version = version;
  writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`Bumped ${pkg.name}: ${JSON.parse(originalJson).version} → ${version}`);
} else {
  console.log(`Publishing ${pkg.name}@${version} (not yet on npm)`);
}

try {
  // ── 4. Build, typecheck, test ────────────────────────────────────────────
  step("Building");
  run("npm", ["run", "build"]);

  step("Typechecking");
  run("npm", ["run", "typecheck"]);

  step("Testing");
  run("npm", ["test"]);

  // Stage package metadata (ensures homepage etc. are correct).
  step("Staging package");
  run("node", ["scripts/stage-package.mjs"]);

  // ── 5. Pack + verify tarball ─────────────────────────────────────────────
  step("Packing and verifying tarball");
  const tmp = mkdtempSync(join(tmpdir(), "pandas-ts-release-"));
  const packedArr = JSON.parse(
    capture("npm", ["pack", "--json", "--pack-destination", tmp]),
  );
  const packed = packedArr[0];
  console.log(
    `Tarball: ${packed.filename} (${(packed.size / 1024).toFixed(0)} kB, ${packed.files.length} files)`,
  );
  checkTarball(packed, JSON.parse(readFileSync(pkgJsonPath, "utf8")));
  console.log("Tarball checks passed ✔");

  // Quick smoke test: install from the tarball in a temp dir, import the package.
  writeFileSync(
    join(tmp, "package.json"),
    '{"name":"smoke","private":true,"type":"module"}\n',
  );
  run("npm", ["install", "--no-audit", "--no-fund", join(tmp, packed.filename)], { cwd: tmp });
  writeFileSync(
    join(tmp, "smoke.mjs"),
    `import { Series, DataFrame } from 'pandas-ts';\n` +
      `const s = new Series([1, 2, 3]);\n` +
      `const ok = s.mean() === 2 && s.sum() === 6;\n` +
      `if (!ok) throw new Error('smoke test failed: mean=' + s.mean() + ' sum=' + s.sum());\n` +
      `const df = new DataFrame({ a: [1,2,3], b: [4,5,6] });\n` +
      `if (df.shape[0] !== 3 || df.shape[1] !== 2) throw new Error('DataFrame smoke failed');\n` +
      `console.log('smoke: pandas-ts@${version} OK (Series.mean=' + s.mean() + ', DataFrame.shape=' + df.shape + ')');\n`,
  );
  run("node", ["smoke.mjs"], { cwd: tmp });
  rmSync(tmp, { recursive: true, force: true });
  console.log("Smoke test passed ✔");

  // ── 6. Publish ────────────────────────────────────────────────────────────
  step(dryRun ? "Publishing (dry run — nothing will be sent to npm)" : "Publishing to npm");
  let otp = otpArg ?? process.env.NPM_OTP ?? null;
  for (let attempt = 1; ; attempt++) {
    const publishArgs = [
      "publish",
      "--access",
      "public",
      ...(dryRun ? ["--dry-run"] : []),
      ...(otp ? [`--otp=${otp}`] : []),
    ];
    try {
      console.log(
        `\n$ npm ${publishArgs.map((a) => (a.startsWith("--otp=") ? "--otp=******" : a)).join(" ")}`,
      );
      execFileSync("npm", publishArgs, {
        stdio: ["inherit", "inherit", "pipe"],
        cwd: root,
        encoding: "utf8",
      });
      break;
    } catch (err) {
      const stderr = String(err.stderr ?? "");
      process.stderr.write(stderr);
      const needsOtp = /EOTP|one-time password/i.test(stderr);
      if (!needsOtp || attempt >= 3 || !process.stdin.isTTY) {
        if (needsOtp)
          console.error("\nnpm needs a 2FA one-time password. Re-run with: npm run release -- --otp <code>");
        throw err;
      }
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      otp = (await rl.question("npm one-time password (authenticator app): ")).trim();
      rl.close();
    }
  }
} catch (err) {
  // Roll back the version bump so package.json is not left in a modified state.
  if (version !== JSON.parse(originalJson).version) {
    writeFileSync(pkgJsonPath, originalJson);
    console.error(`\nRelease aborted; package.json version rolled back to ${JSON.parse(originalJson).version}.`);
  }
  throw err;
}

// ── 7. Commit, tag, (push + GitHub Release) ──────────────────────────────
if (dryRun) {
  if (version !== JSON.parse(originalJson).version) {
    writeFileSync(pkgJsonPath, originalJson);
  }
  console.log(`\nDry run complete — ${pkg.name}@${version} was NOT published.`);
  console.log("Remove --dry-run to do the real release.");
} else {
  step("Committing version bump and tagging");
  if (capture("git", ["status", "--porcelain", pkgJsonPath])) {
    run("git", ["add", pkgJsonPath]);
    run("git", ["commit", "-m", `chore(release): ${pkg.name}@${version}`]);
  }
  const tag = `v${version}`;
  run("git", ["tag", "-a", tag, "-m", `${pkg.name}@${version}`]);

  const releaseUrl = `${REPO_URL}/releases/tag/${tag}`;
  console.log(`\n✔ Published ${pkg.name}@${version}`);
  console.log(`  npm:    https://www.npmjs.com/package/${pkg.name}`);
  console.log(`  Docs:   ${DOCS_URL}`);
  console.log(`  Source: ${REPO_URL}/tree/${tag}`);

  if (opt("--push")) {
    run("git", ["push", "--follow-tags"]);
    // Create a GitHub Release for the tag using the GitHub CLI.
    // Publishing has already succeeded, so a missing/failed `gh` only prints the manual step.
    const notes = [
      `**npm:** \`npm install ${pkg.name}@${version}\``,
      `**API reference:** ${DOCS_URL}`,
      `**Source:** ${REPO_URL}/tree/${tag}`,
    ].join("\n\n");
    try {
      run("gh", [
        "release",
        "create",
        tag,
        "--repo",
        REPO_URL,
        "--title",
        `${pkg.name}@${version}`,
        "--notes",
        notes,
        "--generate-notes",
        "--verify-tag",
        "--latest",
      ]);
      console.log(`  Release: ${releaseUrl}`);
    } catch {
      console.log(`\nCould not create the GitHub Release automatically (is 'gh' installed and logged in?).`);
      console.log(`Create it manually: ${REPO_URL}/releases/new?tag=${tag}`);
    }
  } else {
    console.log("\nNext steps:");
    console.log("  git push --follow-tags");
    console.log(
      `  Create the GitHub Release: ${REPO_URL}/releases/new?tag=${tag}`,
    );
    console.log("  Or re-run with --push to do both automatically:");
    console.log(`  npm run release ${finalBumpType} -- --push`);
  }

  // Remind about updating the api-doc branch.
  console.log(`\n━━ Don't forget: update the api-doc branch ━━`);
  console.log(`  cd .worktrees/api-doc`);
  console.log(`  # copy versions/${version}/ from previous version, update meta.json / api.mjs / changelog`);
  console.log(`  node scripts/build.mjs`);
  console.log(`  git add -A && git commit -m "docs: add v${version}"`);
  console.log(`  git push origin api-doc`);
}
