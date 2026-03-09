#!/usr/bin/env node
/**
 * version-sync.js
 *
 * Bumps the version across all Kode packages simultaneously.
 *
 * Usage:
 *   node scripts/version-sync.js patch    → 0.1.0 → 0.1.1
 *   node scripts/version-sync.js minor    → 0.1.0 → 0.2.0
 *   node scripts/version-sync.js major    → 0.1.0 → 1.0.0
 *   node scripts/version-sync.js 1.2.3    → set exact version
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const PACKAGES = [
    resolve(ROOT, 'package.json'),
    resolve(ROOT, 'packages/core/package.json'),
    resolve(ROOT, 'packages/cli/package.json'),
    resolve(ROOT, 'packages/vscode-extension/package.json'),
];

const bump = process.argv[2];
if (!bump) {
    console.error('\n❌  Usage: node scripts/version-sync.js <patch|minor|major|x.y.z>\n');
    process.exit(1);
}

// ── Read current version from root package.json ───────────────────────────────
const root = JSON.parse(readFileSync(PACKAGES[0], 'utf-8'));
const current = root.version;

// ── Compute new version ───────────────────────────────────────────────────────
function nextVersion(current, bump) {
    if (/^\d+\.\d+\.\d+$/.test(bump)) return bump; // exact

    const [maj, min, pat] = current.split('.').map(Number);
    switch (bump) {
        case 'major': return `${maj + 1}.0.0`;
        case 'minor': return `${maj}.${min + 1}.0`;
        case 'patch': return `${maj}.${min}.${pat + 1}`;
        default:
            console.error(`\n❌  Unknown bump type: "${bump}". Use patch, minor, major, or x.y.z\n`);
            process.exit(1);
    }
}

const next = nextVersion(current, bump);

// ── Update all package.json files ────────────────────────────────────────────
let updated = 0;
for (const pkgPath of PACKAGES) {
    let raw;
    try {
        raw = readFileSync(pkgPath, 'utf-8');
    } catch {
        // Package might not exist yet (e.g. vscode extension) — skip
        continue;
    }

    const pkg = JSON.parse(raw);
    const old = pkg.version;
    pkg.version = next;

    // Also update internal @kode-tools/* dependency versions
    for (const depField of ['dependencies', 'devDependencies', 'peerDependencies']) {
        if (!pkg[depField]) continue;
        for (const dep of Object.keys(pkg[depField])) {
            if (dep.startsWith('@kode-tools/') && pkg[depField][dep] !== '*') {
                pkg[depField][dep] = next;
            }
        }
    }

    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    console.log(`  ✅ ${pkgPath.replace(ROOT + '/', '')}:  ${old} → ${next}`);
    updated++;
}

console.log(`\n  Bumped ${updated} package(s): ${current} → ${next}\n`);
console.log(`  Next steps:`);
console.log(`    npm run build`);
console.log(`    git add -A && git commit -m "chore: release v${next}"`);
console.log(`    git tag v${next}`);
console.log(`    git push && git push --tags`);
console.log(`    npm publish --workspace packages/cli\n`);