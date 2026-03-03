"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KodeConfigSchema = void 0;
exports.defineConfig = defineConfig;
exports.loadConfig = loadConfig;
const zod_1 = require("zod");
const cosmiconfig_1 = require("cosmiconfig");
const cosmiconfig_typescript_loader_1 = require("cosmiconfig-typescript-loader");
// ── Schema ────────────────────────────────────────────────────────────────────
const QualitySchema = zod_1.z.object({
    lint: zod_1.z.boolean().default(true),
    test: zod_1.z.boolean().default(true),
    security: zod_1.z.boolean().default(false),
    coverage: zod_1.z
        .object({
        enabled: zod_1.z.boolean().default(false),
        threshold: zod_1.z.number().min(0).max(100).default(80),
    })
        .default({}),
    customChecks: zod_1.z
        .array(zod_1.z.object({
        name: zod_1.z.string(),
        command: zod_1.z.string(),
    }))
        .default([]),
});
const GitSchema = zod_1.z.object({
    branchPattern: zod_1.z
        .instanceof(RegExp)
        .default(/^(feature|fix|chore|docs|refactor|test)\/[a-z0-9-]+$/),
    commitStyle: zod_1.z.enum(['conventional-commits', 'free-form']).default('conventional-commits'),
    autoGenerateMessages: zod_1.z.boolean().default(true),
});
const IdeSchema = zod_1.z.object({
    reviewOnSave: zod_1.z.boolean().default(true),
    reviewSeverityThreshold: zod_1.z.enum(['error', 'warning', 'info']).default('warning'),
    aiModel: zod_1.z.string().default('claude-sonnet-4-6'),
});
const ProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    template: zod_1.z.string().min(1),
});
exports.KodeConfigSchema = zod_1.z.object({
    project: ProjectSchema,
    git: GitSchema.default({}),
    quality: QualitySchema.default({}),
    ide: IdeSchema.default({}),
});
// ── defineConfig helper ───────────────────────────────────────────────────────
/**
 * Type-safe helper for kode.config.ts files.
 * Usage: export default defineConfig({ project: { name: 'my-app', template: 'node-express' } })
 */
function defineConfig(config) {
    return exports.KodeConfigSchema.parse(config);
}
// ── Loader ────────────────────────────────────────────────────────────────────
async function loadConfig(cwd = process.cwd()) {
    // Try plain JS/JSON cosmiconfig first (works without tsx)
    const explorerSync = (0, cosmiconfig_1.cosmiconfig)('kode', {
        searchPlaces: [
            'kode.config.js',
            'kode.config.cjs',
            '.koderc',
            '.koderc.json',
            'package.json',
        ],
    });
    // Also try TypeScript with loader
    const explorerTs = (0, cosmiconfig_1.cosmiconfig)('kode', {
        searchPlaces: ['kode.config.ts'],
        loaders: {
            '.ts': (0, cosmiconfig_typescript_loader_1.TypeScriptLoader)(),
        },
    });
    let result = null;
    // Try TS first, fall back to JS
    try {
        result = await explorerTs.search(cwd);
    }
    catch {
        // tsx not available or other error — try JS config
    }
    if (!result || result.isEmpty) {
        result = await explorerSync.search(cwd);
    }
    if (!result || result.isEmpty) {
        throw new Error(`No kode.config.ts found in ${cwd}.\n` +
            `Run "kode setup" to create one, or create kode.config.ts manually.`);
    }
    try {
        return exports.KodeConfigSchema.parse(result.config);
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            const messages = err.errors
                .map((e) => `  • ${e.path.join('.')}: ${e.message}`)
                .join('\n');
            throw new Error(`Invalid kode.config.ts:\n${messages}`);
        }
        throw err;
    }
}
//# sourceMappingURL=index.js.map