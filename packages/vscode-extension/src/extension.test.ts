import { describe, it, expect } from 'vitest';

describe('Stage 1.1 — VS Code extension smoke test', () => {
    it('extension module is importable without vscode runtime', async () => {
        const ext = await import('./extension');
        expect(ext.activate).toBeTypeOf('function');
        expect(ext.deactivate).toBeTypeOf('function');
    });

    it('core dependency is resolvable', async () => {
        const core = await import('@kode/core');
        expect(core).toBeDefined();
        expect(core.CONFIG_VERSION).toBe('0.0.1');
    });
});