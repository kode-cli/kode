import { describe, it, expect } from 'vitest';

describe('Stage 1.2 — Core package exports', () => {
    it('exports defineConfig from config', async () => {
        const { defineConfig } = await import('./config');
        expect(defineConfig).toBeTypeOf('function');
    });

    it('exports renderTemplate from templates', async () => {
        const { renderTemplate } = await import('./templates');
        expect(renderTemplate).toBeTypeOf('function');
    });

    it('exports getAvailableTemplates from templates', async () => {
        const { getAvailableTemplates } = await import('./templates');
        expect(getAvailableTemplates).toBeTypeOf('function');
    });

    it('exports KodeConfigSchema from config', async () => {
        const { KodeConfigSchema } = await import('./config');
        expect(KodeConfigSchema).toBeDefined();
    });
});
