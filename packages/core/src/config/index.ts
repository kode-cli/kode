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
        .array(
            z.object({
                name: z.string(),
                command: z.string(),
            })
        )
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

export type KodeConfig = z.infer<typeof KodeConfigSchema>;
export type QualityConfig = z.infer<typeof QualitySchema>;
export type GitConfig = z.infer<typeof GitSchema>;

// ── defineConfig helper ───────────────────────────────────────────────────────

/**
 * Type-safe helper for kode.config.ts files.
 * Usage: export default defineConfig({ project: { name: 'my-app', template: 'node-express' } })
 */
export function defineConfig(
    config: Partial<KodeConfig> & { project: KodeConfig['project'] }
): KodeConfig {
    return KodeConfigSchema.parse(config);
}

// ── Loader ────────────────────────────────────────────────────────────────────

export async function loadConfig(cwd: string = process.cwd()): Promise<KodeConfig> {
    // Try plain JS/JSON cosmiconfig first (works without tsx)
    const explorerSync = cosmiconfig('kode', {
        searchPlaces: [
            'kode.config.js',
            'kode.config.cjs',
            '.koderc',
            '.koderc.json',
            'package.json',
        ],
    });

    // Also try TypeScript with loader
    const explorerTs = cosmiconfig('kode', {
        searchPlaces: ['kode.config.ts'],
        loaders: {
            '.ts': TypeScriptLoader(),
        },
    });

    let result = null;

    // Try TS first, fall back to JS
    try {
        result = await explorerTs.search(cwd);
    } catch {
        // tsx not available or other error — try JS config
    }

    if (!result || result.isEmpty) {
        result = await explorerSync.search(cwd);
    }

    if (!result || result.isEmpty) {
        throw new Error(
            `No kode.config.ts found in ${cwd}.\n` +
            `Run "kode setup" to create one, or create kode.config.ts manually.`
        );
    }

    try {
        return KodeConfigSchema.parse(result.config);
    } catch (err) {
        if (err instanceof z.ZodError) {
            const messages = err.errors
                .map((e) => `  • ${e.path.join('.')}: ${e.message}`)
                .join('\n');
            throw new Error(`Invalid kode.config.ts:\n${messages}`);
        }
        throw err;
    }
}