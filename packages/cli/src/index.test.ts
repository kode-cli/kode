import { describe, it, expect } from 'vitest';

describe('Stage 1.1 — CLI package smoke test', () => {
    it('CLI package is importable', async () => {
        // Verify the CLI src entry point can be imported without errors
        const cli = await import('./index.js');
        expect(cli).toBeDefined();
    });

    it('core dependency is resolvable', async () => {
        // Verify the workspace link to @kode/core resolves
        const core = await import('@kode/core');
        expect(core).toBeDefined();
    });
});