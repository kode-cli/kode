import { z } from 'zod';
import { cosmiconfig } from 'cosmiconfig';
import { TypeScriptLoader } from 'cosmiconfig-typescript-loader';
// ── Schema ────────────────────────────────────────────────────────────────────
const QualitySchema = z.object({
    lint: z.boolean().default(true),
    test: z.boolean().default(true),
    security: z.boolean().default(false),
    coverage: z
        .object({
        enabled: z.boolean().default(false),
        threshold: z.number().min(0).max(100).default(80),
    })
        .default({}),
    customChecks: z
        .array(z.object({
        name: z.string(),
        command: z.string(),
    }))
        .default([]),
});
const GitSchema = z.object({
    branchPattern: z
        .instanceof(RegExp)
        .default(/^(feature|fix|chore|docs|refactor|test)\/[a-z0-9-]+$/),
    commitStyle: z.enum(['conventional-commits', 'free-form']).default('conventional-commits'),
    autoGenerateMessages: z.boolean().default(true),
});
const IdeSchema = z.object({
    reviewOnSave: z.boolean().default(true),
    reviewSeverityThreshold: z.enum(['error', 'warning', 'info']).default('warning'),
    aiModel: z.string().default('claude-sonnet-4-6'),
});
const ProjectSchema = z.object({
    name: z.string().min(1),
    template: z.string().min(1),
});
export const KodeConfigSchema = z.object({
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
export function defineConfig(config) {
    return KodeConfigSchema.parse(config);
}
// ── Loader ────────────────────────────────────────────────────────────────────
export async function loadConfig(cwd = process.cwd()) {
    const explorer = cosmiconfig('kode', {
        searchPlaces: [
            'kode.config.ts',
            'kode.config.js',
            'kode.config.cjs',
            '.koderc',
            '.koderc.json',
            'package.json',
        ],
        loaders: {
            '.ts': TypeScriptLoader(),
        },
    });
    let result = null;
    try {
        result = await explorer.search(cwd);
    }
    catch {
        // TS loader not available — retry without it (JS/JSON only)
        const fallback = cosmiconfig('kode', {
            searchPlaces: [
                'kode.config.js',
                'kode.config.cjs',
                '.koderc',
                '.koderc.json',
                'package.json',
            ],
        });
        result = await fallback.search(cwd);
    }
    if (!result || result.isEmpty) {
        throw new Error(`No kode.config.ts found in ${cwd}.\n` +
            `Run "kode setup" to create one, or create kode.config.ts manually.`);
    }
    try {
        return KodeConfigSchema.parse(result.config);
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            const messages = err.errors
                .map((e) => `  • ${e.path.join('.')}: ${e.message}`)
                .join('\n');
            throw new Error(`Invalid kode.config.ts:\n${messages}`);
        }
        throw err;
    }
}
//# sourceMappingURL=index.js.map