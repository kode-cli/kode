import { z } from 'zod';
import { cosmiconfig } from 'cosmiconfig';

// ── Server schema ─────────────────────────────────────────────────────────────

const ServerSchema = z.object({
    host: z.string().min(1),
    user: z.string().default('root'),
    port: z.number().default(22),
    keyPath: z.string().optional(),
    label: z.string().optional(),
});

// ── Staging environment ───────────────────────────────────────────────────────

const StagingSchema = z.object({
    target: z.literal('docker-desktop'),
    port: z.number().default(3000),
    envFile: z.string().optional(),
    containerName: z.string().optional(),
    volumes: z.array(z.string()).default([]),
    network: z.string().optional(),
    pullPolicy: z.enum(['always', 'if-not-present']).default('always'),
    restartPolicy: z.string().default('unless-stopped'),
});

// ── Production environment ────────────────────────────────────────────────────

const RollingSchema = z.object({
    maxUnavailable: z.number().default(1),
    waitBetweenServers: z.number().default(10),
});

const BlueGreenSchema = z.object({
    cutoverMode: z.enum(['auto', 'manual']).default('auto'),
    keepOldFor: z.number().default(60),
});

const ProductionSchema = z.object({
    target: z.literal('remote-ssh'),
    servers: z.array(ServerSchema).min(1),
    port: z.number().default(3000),
    envFile: z.string().optional(),
    strategy: z.enum(['rolling', 'blue-green']).default('rolling'),
    rolling: RollingSchema.optional(),
    blueGreen: BlueGreenSchema.optional(),
    network: z.string().optional(),
});

// ── Health check ──────────────────────────────────────────────────────────────

const HealthCheckSchema = z.object({
    endpoint: z.string().default('/health'),
    expectedStatus: z.number().default(200),
    timeout: z.number().default(5),
    retries: z.number().default(3),
    retryInterval: z.number().default(10),
    startupGrace: z.number().default(15),
    customScript: z.string().optional(),
});

// ── Rollback ──────────────────────────────────────────────────────────────────

const RollbackSchema = z.object({
    keepVersions: z.number().default(5),
    autoRollbackOnFail: z.boolean().default(true),
    snapshotBeforeDeploy: z.boolean().default(true),
    historyFile: z.string().default('.kode/deploy-history.json'),
});

// ── Hooks ─────────────────────────────────────────────────────────────────────

const HookCommandsSchema = z.union([
    z.string(),
    z.array(z.string()),
]);

const PostDeploySchema = z.union([
    z.array(z.string()),
    z.object({
        staging: z.array(z.string()).optional(),
        production: z.array(z.string()).optional(),
    }),
]);

const HooksSchema = z.object({
    preBuild: z.array(z.string()).optional(),
    postBuild: z.array(z.string()).optional(),
    preDeploy: z.array(z.string()).optional(),
    postDeploy: PostDeploySchema.optional(),
    onSuccess: z.array(z.string()).optional(),
    onFailure: z.array(z.string()).optional(),
});

// ── Notifications ─────────────────────────────────────────────────────────────

const SlackSchema = z.object({
    webhookUrl: z.string().url(),
    channel: z.string().optional(),
    channels: z.object({
        staging: z.string().optional(),
        production: z.string().optional(),
    }).optional(),
    onEvents: z.array(z.enum(['start', 'success', 'failure', 'rollback'])).default([
        'start', 'success', 'failure', 'rollback',
    ]),
});

const NotificationsSchema = z.object({
    slack: SlackSchema.optional(),
});

// ── CLI settings ──────────────────────────────────────────────────────────────

const CliSchema = z.object({
    defaultEnv: z.enum(['staging', 'production']).default('staging'),
    confirmProduction: z.boolean().default(true),
    logLevel: z.enum(['silent', 'info', 'verbose', 'debug']).default('info'),
    dryRun: z.boolean().default(false),
});

// ── Project ───────────────────────────────────────────────────────────────────

/**
 * Well-known project types and the internal container port they listen on by default.
 *
 * | type          | default container port | notes                              |
 * |---------------|------------------------|------------------------------------|
 * | node-express  | 3000                   | Express / Fastify / Koa            |
 * | react-app     | 80                     | Nginx-served static build          |
 * | next-app      | 3000                   | `next start` default               |
 * | vite-app      | 4173                   | `vite preview` default             |
 * | nest-app      | 3000                   | NestJS default                     |
 * | generic       | 3000                   | fallback — override via containerPort |
 */
export const PROJECT_TYPES = ['node-express', 'react-app', 'next-app', 'vite-app', 'nest-app', 'generic'] as const;
export type ProjectType = typeof PROJECT_TYPES[number];

export const DEFAULT_CONTAINER_PORTS: Record<ProjectType, number> = {
    'node-express': 3000,
    'react-app':    80,
    'next-app':     3000,
    'vite-app':     4173,
    'nest-app':     3000,
    'generic':      3000,
};

/**
 * Returns the internal container port for a project.
 * Priority: explicit `containerPort` → project-type default → 3000 fallback.
 */
export function resolveContainerPort(project: { type?: ProjectType; containerPort?: number }): number {
    if (project.containerPort != null) return project.containerPort;
    if (project.type) return DEFAULT_CONTAINER_PORTS[project.type];
    return 3000;
}

const ProjectSchema = z.object({
    name: z.string().min(1, 'project.name is required'),
    type: z.enum(PROJECT_TYPES).default('generic'),
    containerPort: z.number().optional(),
    version: z.string().optional(),
    registry: z.string().optional(),
    dockerfile: z.string().default('./Dockerfile'),
    buildContext: z.string().default('.'),
    buildArgs: z.record(z.string()).optional(),
});

// ── Env vars ──────────────────────────────────────────────────────────────────

const EnvVarsSchema = z.object({
    required: z.array(z.string()).optional(),
    shared: z.record(z.string()).optional(),
    staging: z.record(z.string()).optional(),
    production: z.record(z.string()).optional(),
});

// ── Full config ───────────────────────────────────────────────────────────────

export const DeployConfigSchema = z.object({
    project: ProjectSchema,
    environments: z.object({
        staging: StagingSchema.optional(),
        production: ProductionSchema.optional(),
    }),
    envVars: EnvVarsSchema.optional(),
    healthCheck: HealthCheckSchema.optional(),
    rollback: RollbackSchema.optional(),
    hooks: HooksSchema.optional(),
    notifications: NotificationsSchema.optional(),
    cli: CliSchema.default({}),
});

export type DeployConfig = z.infer<typeof DeployConfigSchema>;
export type ServerConfig = z.infer<typeof ServerSchema>;
export type StagingConfig = z.infer<typeof StagingSchema>;
export type ProductionConfig = z.infer<typeof ProductionSchema>;
export type HealthCheckConfig = z.infer<typeof HealthCheckSchema>;
export type RollbackConfig = z.infer<typeof RollbackSchema>;
export type HooksConfig = z.infer<typeof HooksSchema>;

// ── defineDeployConfig helper ─────────────────────────────────────────────────

export function defineDeployConfig(
    config: z.input<typeof DeployConfigSchema>
): z.input<typeof DeployConfigSchema> {
    return config;
}

// ── Loader ────────────────────────────────────────────────────────────────────

export async function loadDeployConfig(cwd: string = process.cwd()): Promise<DeployConfig> {
    const explorer = cosmiconfig('kode-deploy', {
        searchPlaces: [
            'kode.deploy.config.js',
            'kode.deploy.config.cjs',
            'kode.deploy.config.json',
        ],
    });

    const result = await explorer.search(cwd);

    if (!result || result.isEmpty) {
        throw new Error(
            'No kode.deploy.config.js found.\n' +
            'Run `kode deploy init` to create one.'
        );
    }

    try {
        return DeployConfigSchema.parse(result.config);
    } catch (err) {
        if (err instanceof Error && err.message.includes('ZodError')) {
            throw new Error(`Invalid kode.deploy.config.js:\n${err.message}`);
        }
        throw err;
    }
}