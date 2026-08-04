// Bump the patch version in package.json (and the two places package-lock.json
// keeps it in step). Run by the pre-commit hook — see .githooks/pre-commit.
//
// Both files round-trip byte-identically through JSON.stringify(…, null, 2),
// which is how npm writes them, so rewriting them here changes the version
// line and nothing else.
//
// Never exits non-zero for anything but a genuine write failure: a version
// bump is a convenience, and blocking a commit over one would be worse than
// skipping it.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = join(root, 'package.json');
const lockPath = join(root, 'package-lock.json');

/** "1.2.3" → "1.2.4". Returns null for anything that isn't plain semver —
 *  a prerelease like "1.2.3-beta.1" means someone is mid-release and a blind
 *  patch bump is not what they want. */
function nextPatch(version) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version ?? '');
  return m ? `${m[1]}.${m[2]}.${Number(m[3]) + 1}` : null;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

const pkg = readJson(pkgPath);
if (!pkg) {
  console.error('[bump-version] package.json unreadable — leaving the version alone.');
  process.exit(0);
}

const next = nextPatch(pkg.version);
if (!next) {
  console.error(`[bump-version] version "${pkg.version}" is not plain semver — skipping.`);
  process.exit(0);
}

pkg.version = next;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

// The lockfile carries the version twice: at the root and on the "" package
// entry. Leaving either behind makes `npm ci` warn about being out of sync.
const lock = readJson(lockPath);
if (lock) {
  lock.version = next;
  if (lock.packages?.['']) lock.packages[''].version = next;
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
}

// Printed so the hook can stage exactly what changed.
console.log(next);
