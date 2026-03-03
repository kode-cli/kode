import { describe, it, expect } from 'vitest';
import path from 'path';
import { KodeConfigSchema, defineConfig, loadConfig } from './index';

describe('KodeConfigSchema', () => {
    it('parses a minimal valid config', () => {
        const config = KodeConfigSchema.parse({
            project: { name: 'my-app', template: 'node-express' },
        });
        expect(config.project.name).toBe('my-app');
        expect(config.project.template).toBe('node-express');
    });

    it('applies defaults for git, quality, ide', () => {
        const config = KodeConfigSchema.parse({
            project: { name: 'test', template: 'react-app' },
        });
        expect(config.git.commitStyle).toBe('conventional-commits');
        expect(config.git.autoGenerateMessages).toBe(true);
        expect(config.quality.lint).toBe(true);
        expect(config.quality.test).toBe(true);
        expect(config.quality.coverage.threshold).toBe(80);
        expect(config.ide.reviewOnSave).toBe(true);
        expect(config.ide.aiModel).toBe('claude-sonnet-4-6');
    });

    it('accepts a full custom config', () => {
        const config = KodeConfigSchema.parse({
            project: { name: 'full-app', template: 'node-express' },
            git: {
                branchPattern: /^main$/,
                commitStyle: 'free-form',
                autoGenerateMessages: false,
            },
            quality: {
                lint: true,
                test: false,
                security: true,
                coverage: { enabled: true, threshold: 90 },
                customChecks: [{ name: 'typecheck', command: 'tsc --noEmit' }],
            },
            ide: {
                reviewOnSave: false,
                reviewSeverityThreshold: 'error',
                aiModel: 'claude-opus-4-6',
            },
        });
        expect(config.quality.coverage.threshold).toBe(90);
        expect(config.quality.customChecks).toHaveLength(1);
        expect(config.ide.reviewSeverityThreshold).toBe('error');
    });

    it('throws on missing project.name', () => {
        expect(() =>
            KodeConfigSchema.parse({ project: { template: 'node-express' } })
        ).toThrow();
    });

    it('throws on missing project.template', () => {
        expect(() =>
            KodeConfigSchema.parse({ project: { name: 'my-app' } })
        ).toThrow();
    });

    it('throws on invalid coverage threshold', () => {
        expect(() =>
            KodeConfigSchema.parse({
                project: { name: 'x', template: 'y' },
                quality: { coverage: { enabled: true, threshold: 150 } },
            })
        ).toThrow();
    });
});

describe('defineConfig', () => {
    it('returns a fully-parsed config with defaults filled in', () => {
        const config = defineConfig({
            project: { name: 'my-app', template: 'node-express' },
        });
        expect(config.git.commitStyle).toBe('conventional-commits');
        expect(config.quality.lint).toBe(true);
    });

    it('preserves overrides', () => {
        const config = defineConfig({
            project: { name: 'my-app', template: 'node-express' },
            quality: { lint: false, test: false, security: true, coverage: { enabled: true, threshold: 85 }, customChecks: [{ name: 'check', command: 'echo check' }] },
        });
        expect(config.quality.lint).toBe(false);
    });
});

describe('loadConfig', () => {
    it('throws a helpful error when no config file is found', async () => {
        await expect(loadConfig('/tmp/nonexistent-kode-project')).rejects.toThrow(
            'No kode.config.ts found'
        );
    });

    it('loads a real config file from fixtures', async () => {
        const fixtureDir = path.resolve(__dirname, '__fixtures__/valid');
        const config = await loadConfig(fixtureDir);
        expect(config.project.name).toBe('fixture-app');
        expect(config.project.template).toBe('node-express');
    });

    it('throws a clear Zod error for invalid config', async () => {
        const fixtureDir = path.resolve(__dirname, '__fixtures__/invalid');
        await expect(loadConfig(fixtureDir)).rejects.toThrow('Invalid kode.config.ts');
    });
});
