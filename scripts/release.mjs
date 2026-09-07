// Cut a release in two phases (same convention as pdfmana, minus the zip).
//
//   npm run release            bump version → npm run check → "Release vX" commit → tag vX
//   npm run release:publish    push main + tag → GitHub release with the CHANGELOG notes
//
// Versioning: each component counts 0–9 and carries into the next —
// 1.0.8 → 1.0.9 → 1.1.0 → 1.1.1 … 1.9.9 → 2.0.0. Not semver; the version is a
// simple odometer so the number on the help page stays short.
//
// The split keeps the remote, irreversible steps (push, gh release) behind an
// explicit second command so the release commit can be reviewed first. The
// push is also the production deploy: the Vercel project is git-connected.
import { execFileSync, execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const publish = args.includes("--publish");

const git = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim();
const readVersion = () => JSON.parse(readFileSync("package.json", "utf8")).version;

function fail(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

// Odometer bump: every component counts 0–9, carrying into the next.
export function bumpVersion(version) {
  let [maj, min, pat] = version.split(".").map(Number);
  pat += 1;
  if (pat > 9) {
    pat = 0;
    min += 1;
  }
  if (min > 9) {
    min = 0;
    maj += 1;
  }
  return `${maj}.${min}.${pat}`;
}

// The given version's section: everything between its "## [X.Y.Z]" heading and
// the next "## [" heading (or EOF), trimmed. Null if the heading is missing.
function changelogSection(version) {
  const changelog = readFileSync("CHANGELOG.md", "utf8");
  const escaped = version.replaceAll(".", "\\.");
  const m = changelog.match(
    new RegExp(`^## \\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=^## \\[|$(?![\\s\\S]))`, "m"),
  );
  return m ? m[1].trim() : null;
}

// ---- Phase 2: publish (push + GitHub release) --------------------------------

if (publish) {
  const version = readVersion();
  const tag = `v${version}`;

  if (!git("tag", "-l", tag)) fail(`tag ${tag} does not exist — run "npm run release" first`);
  const notes = changelogSection(version);
  if (!notes) fail(`CHANGELOG.md has no "## [${version}]" section`);
  try {
    execFileSync("gh", ["auth", "status"], { stdio: "ignore" });
  } catch {
    fail('gh is not authenticated — run "gh auth login"');
  }
  let exists = false;
  try {
    execFileSync("gh", ["release", "view", tag], { stdio: "ignore" });
    exists = true;
  } catch {
    // not found — good
  }
  if (exists) fail(`GitHub release ${tag} already exists`);

  // Push before gh release create so gh finds the tag on the remote
  // (--verify-tag then guarantees it never invents one).
  console.log(`→ pushing main + ${tag} (the push deploys production)`);
  execFileSync("git", ["push", "origin", "main"], { stdio: "inherit" });
  execFileSync("git", ["push", "origin", tag], { stdio: "inherit" });
  console.log(`→ creating GitHub release ${tag}`);
  execFileSync(
    "gh",
    ["release", "create", tag, "--title", tag, "--verify-tag", "--notes-file", "-"],
    { stdio: ["pipe", "inherit", "inherit"], input: notes },
  );
  console.log(`\n✓ published ${tag} — watch the Vercel deployment for the pushed commit`);
  process.exit(0);
}

// ---- Phase 1: cut the release -------------------------------------------------

const branch = git("rev-parse", "--abbrev-ref", "HEAD");
if (branch !== "main") fail(`releases are cut from main (currently on "${branch}")`);

const next = bumpVersion(readVersion());
if (!changelogSection(next)) {
  fail(`CHANGELOG.md has no "## [${next}]" section — write the changelog entry first`);
}
if (git("tag", "-l", `v${next}`)) fail(`tag v${next} already exists`);

const releaseFiles = ["package.json", "package-lock.json", "CHANGELOG.md"];
const dirty = git("status", "--porcelain")
  .split("\n")
  .filter((l) => l && !releaseFiles.includes(l.slice(3)));
if (dirty.length) {
  console.warn(`⚠ uncommitted changes NOT included in the release commit:\n  ${dirty.join("\n  ")}`);
}

execSync(`npm version ${next} --no-git-tag-version`, { stdio: "inherit" });
const version = readVersion();

console.log(`\n→ checking v${version} (lint, typecheck, tests, build)`);
execSync("npm run check", { stdio: "inherit" });

// Pathspec form so nothing outside these three files is swept into the
// commit (unstaged edits to them ARE included — the CHANGELOG entry is
// the point).
execFileSync(
  "git",
  ["commit", "-m", `Release v${version}`, "--", ...releaseFiles],
  { stdio: "inherit" },
);
execFileSync("git", ["tag", "-a", `v${version}`, "-m", `Release v${version}`], {
  stdio: "inherit",
});
console.log(`\n✓ committed + tagged v${version}`);
console.log("  review the commit, then: npm run release:publish");
