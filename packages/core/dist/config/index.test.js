"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const path_1 = __importDefault(require("path"));
const index_1 = require("./index");
(0, vitest_1.describe)('KodeConfigSchema', () => {
    (0, vitest_1.it)('parses a minimal valid config', () => {
        const config = index_1.KodeConfigSchema.parse({
            project: { name: 'my-app', template: 'node-express' },
        });
        (0, vitest_1.expect)(config.project.name).toBe('my-app');
        (0, vitest_1.expect)(config.project.template).toBe('node-express');
    });
    (0, vitest_1.it)('applies defaults for git, quality, ide', () => {
        const config = index_1.KodeConfigSchema.parse({
            project: { name: 'test', template: 'react-app' },
        });
        (0, vitest_1.expect)(config.git.commitStyle).toBe('conventional-commits');
        (0, vitest_1.expect)(config.git.autoGenerateMessages).toBe(true);
        (0, vitest_1.expect)(config.quality.lint).toBe(true);
        (0, vitest_1.expect)(config.quality.test).toBe(true);
        (0, vitest_1.expect)(config.quality.coverage.threshold).toBe(80);
        (0, vitest_1.expect)(config.ide.reviewOnSave).toBe(true);
        (0, vitest_1.expect)(config.ide.aiModel).toBe('claude-sonnet-4-6');
    });
    (0, vitest_1.it)('accepts a full custom config', () => {
        const config = index_1.KodeConfigSchema.parse({
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
        (0, vitest_1.expect)(config.quality.coverage.threshold).toBe(90);
        (0, vitest_1.expect)(config.quality.customChecks).toHaveLength(1);
        (0, vitest_1.expect)(config.ide.reviewSeverityThreshold).toBe('error');
    });
    (0, vitest_1.it)('throws on missing project.name', () => {
        (0, vitest_1.expect)(() => index_1.KodeConfigSchema.parse({ project: { template: 'node-express' } })).toThrow();
    });
    (0, vitest_1.it)('throws on missing project.template', () => {
        (0, vitest_1.expect)(() => index_1.KodeConfigSchema.parse({ project: { name: 'my-app' } })).toThrow();
    });
    (0, vitest_1.it)('throws on invalid coverage threshold', () => {
        (0, vitest_1.expect)(() => index_1.KodeConfigSchema.parse({
            project: { name: 'x', template: 'y' },
            quality: { coverage: { enabled: true, threshold: 150 } },
        })).toThrow();
    });
});
(0, vitest_1.describe)('defineConfig', () => {
    (0, vitest_1.it)('returns a fully-parsed config with defaults filled in', () => {
        const config = (0, index_1.defineConfig)({
            project: { name: 'my-app', template: 'node-express' },
        });
        (0, vitest_1.expect)(config.git.commitStyle).toBe('conventional-commits');
        (0, vitest_1.expect)(config.quality.lint).toBe(true);
    });
    (0, vitest_1.it)('preserves overrides', () => {
        const config = (0, index_1.defineConfig)({
            project: { name: 'my-app', template: 'node-express' },
            quality: { lint: false, test: false, security: true, coverage: { enabled: true, threshold: 85 }, customChecks: [{ name: 'check', command: 'echo check' }] },
        });
        (0, vitest_1.expect)(config.quality.lint).toBe(false);
    });
});
(0, vitest_1.describe)('loadConfig', () => {
    (0, vitest_1.it)('throws a helpful error when no config file is found', async () => {
        await (0, vitest_1.expect)((0, index_1.loadConfig)('/tmp/nonexistent-kode-project')).rejects.toThrow('No kode.config.ts found');
    });
    (0, vitest_1.it)('loads a real config file from fixtures', async () => {
        const fixtureDir = path_1.default.resolve(__dirname, '__fixtures__/valid');
        const config = await (0, index_1.loadConfig)(fixtureDir);
        (0, vitest_1.expect)(config.project.name).toBe('fixture-app');
        (0, vitest_1.expect)(config.project.template).toBe('node-express');
    });
    (0, vitest_1.it)('throws a clear Zod error for invalid config', async () => {
        const fixtureDir = path_1.default.resolve(__dirname, '__fixtures__/invalid');
        await (0, vitest_1.expect)((0, index_1.loadConfig)(fixtureDir)).rejects.toThrow('Invalid kode.config.ts');
    });
});
//# sourceMappingURL=index.test.js.map