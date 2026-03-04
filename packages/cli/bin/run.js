#!/usr/bin/env node

// ── Node version check ────────────────────────────────────────────────────────
const [major] = process.versions.node.split('.').map(Number);
if (major < 18) {
    process.stderr.write(
        '\n❌  Kode requires Node.js 18 or later.\n' +
        `   You are running Node.js ${process.versions.node}.\n` +
        '   Install the latest LTS at: https://nodejs.org\n\n'
    );
    process.exit(1);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
    // Load global config (~/.kode/config.json) into process.env
    // so ANTHROPIC_API_KEY etc. are available without manual export
    try {
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const corePath = require.resolve('@kode-tools/core');
        const core = await import(corePath);
        if (typeof core.injectGlobalConfig === 'function') {
            await core.injectGlobalConfig();
        }
    } catch {
        // Core not available yet (e.g. first install) — continue silently
    }

    // ── Launch oclif ──────────────────────────────────────────────────────────
    const { run, flush, Errors } = await import('@oclif/core');

    try {
        await run(process.argv.slice(2), import.meta.url);
        await flush();
    } catch (err) {
        // Handle oclif's internal exit errors cleanly (no stack trace)
        if (err && typeof err === 'object' && 'oclif' in err) {
            const exit = err.oclif?.exit;
            if (exit === 0) process.exit(0);
            if (typeof exit === 'number') process.exit(exit);
        }
        await Errors.handle(err);
        await flush();
    }
}

bootstrap();