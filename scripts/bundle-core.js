#!/usr/bin/env node
/**
 * bundle-core.js
 *
 * Copies the built @kode-tools/core package into packages/cli/node_modules/@kode-tools/core
 * so it gets bundled inside the CLI tarball via "bundledDependencies".
 *
 * This ensures `npm install -g @kode-tools/cli` works without needing
 * @kode-tools/core to be published separately on npm.
 */

import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const coreSrc  = join(root, 'packages', 'core');
const coreDest = join(root, 'packages', 'cli', 'node_modules', '@kode-tools', 'core');

// Ensure destination directory exists
mkdirSync(join(root, 'packages', 'cli', 'node_modules', '@kode-tools'), { recursive: true });

// Copy core dist + package.json into CLI local node_modules
const itemsToCopy = ['dist', 'package.json'];

for (const item of itemsToCopy) {
  const src  = join(coreSrc, item);
  const dest = join(coreDest, item);

  if (!existsSync(src)) {
    console.error(`❌  bundle-core: missing source: ${src}`);
    console.error('   Run "npm run build:core" first.');
    process.exit(1);
  }

  cpSync(src, dest, { recursive: true, force: true });
}

console.log('✅  bundle-core: @kode-tools/core bundled into CLI node_modules');

