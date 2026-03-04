import { Command } from '@oclif/core';
import { select, input, confirm } from '@inquirer/prompts';
import fs from 'fs-extra';
import path from 'path';
import { DEFAULT_CONTAINER_PORTS, type ProjectType } from '@kode-tools/core';

// Local labels used only for display / Dockerfile generation
type LocalProjectType = 'nextjs' | 'react' | 'express' | 'node';

/** Map local detected type → canonical ProjectType used in config + port resolution */
const LOCAL_TO_PROJECT_TYPE: Record<LocalProjectType, ProjectType> = {
    nextjs:  'next-app',
    react:   'react-app',
    express: 'node-express',
    node:    'generic',
};

export default class DeployInit extends Command {
    static description = 'Generate a kode.deploy.config.js file interactively';

    static examples = ['$ kode deploy:init'];

    private async isEsModule(cwd: string): Promise<boolean> {
        const pkgPath = path.join(cwd, 'package.json');
        if (await fs.pathExists(pkgPath)) {
            const pkg = await fs.readJson(pkgPath) as { type?: string };
            return pkg.type === 'module';
        }
        return false;
    }

    async run(): Promise<void> {
        const cwd = process.cwd();
        const esm = await this.isEsModule(cwd);
        const configFilename = esm ? 'kode.deploy.config.cjs' : 'kode.deploy.config.js';
        const configPath = path.join(cwd, configFilename);

        if (await fs.pathExists(configPath)) {
            const overwrite = await confirm({
                message: `${configFilename} already exists. Overwrite?`,
                default: false,
            });
            if (!overwrite) {
                this.log('\n🚫 Aborted.\n');
                return;
            }
        }

        this.log('\n⚙️  Let\'s set up your deployment config.\n');

        // ── Gather inputs ─────────────────────────────────────────────────────
        const appName = await input({
            message: 'App name:',
            default: path.basename(cwd),
            validate: (v) => v.trim().length > 0 ? true : 'App name is required',
        });

        // Detect project type early so we can use it in port defaults + config generation
        const localProjectType = await this.detectProjectType(cwd);
        const projectType = LOCAL_TO_PROJECT_TYPE[localProjectType];
        const defaultContainerPort = DEFAULT_CONTAINER_PORTS[projectType];

        const typeLabel: Record<LocalProjectType, string> = {
            nextjs: 'Next.js',
            react: 'React (static)',
            express: 'Node / Express',
            node: 'Generic Node.js',
        };
        this.log(`   Detected project type: ${typeLabel[localProjectType]}`);

        const useStaging = await confirm({
            message: 'Configure staging environment (Docker Desktop)?',
            default: true,
        });

        const stagingPort = useStaging
            ? await input({ message: 'Staging port:', default: '3001' })
            : '3001';

        const useProduction = await confirm({
            message: 'Configure production environment (remote SSH)?',
            default: true,
        });

        let prodHost = '';
        let prodUser = 'deploy';
        let prodKeyPath = '~/.ssh/id_rsa';

        if (useProduction) {
            prodHost = await input({
                message: 'Production server IP or hostname:',
                validate: (v) => v.trim().length > 0 ? true : 'Server host is required',
            });
            prodUser = await input({ message: 'SSH user:', default: 'deploy' });
            prodKeyPath = await input({ message: 'SSH key path:', default: '~/.ssh/id_rsa' });
        }

        const strategy = useProduction
            ? await select({
                message: 'Deploy strategy:',
                choices: [
                    { name: 'Rolling (deploy one server at a time)', value: 'rolling' },
                    { name: 'Blue-Green (zero downtime cutover)', value: 'blue-green' },
                ],
            })
            : 'rolling';

        const useHealthCheck = await confirm({
            message: 'Enable health check after deploy?',
            default: true,
        });

        const useSlack = await confirm({
            message: 'Send Slack notifications?',
            default: false,
        });

        const useRollback = await confirm({
            message: 'Enable deployment history and rollback?',
            default: true,
        });

        // ── Generate config ───────────────────────────────────────────────────
        const config = this.generateConfig({
            appName,
            projectType,
            useStaging,
            stagingPort: parseInt(stagingPort),
            useProduction,
            prodHost,
            prodUser,
            prodKeyPath,
            strategy,
            useHealthCheck,
            useSlack,
            useRollback,
        });

        await fs.writeFile(configPath, config, 'utf-8');

        this.log(`\n✅ Created: ${configFilename}\n`);

        // ── Dockerfile generation ─────────────────────────────────────────────
        const dockerfilePath = path.join(cwd, 'Dockerfile');
        if (!(await fs.pathExists(dockerfilePath))) {
            this.log('🐳 No Dockerfile found.');

            const generateDockerfile = await confirm({
                message: `Generate a Dockerfile for a ${typeLabel[localProjectType]} app?`,
                default: true,
            });

            if (generateDockerfile) {
                const dockerfile = this.generateDockerfile(localProjectType, appName, defaultContainerPort);
                await fs.writeFile(dockerfilePath, dockerfile, 'utf-8');
                this.log(`✅ Created: Dockerfile\n`);
            } else {
                this.log('⚠️  Skipped Dockerfile generation. Remember to create one before deploying.\n');
            }
        } else {
            this.log('🐳 Dockerfile already exists — skipping generation.\n');
        }

        this.log('   Next steps:\n');
        if (useProduction) {
            this.log(`   1. Set PROD_SERVER_IP in your environment`);
            this.log(`   2. Ensure SSH access: ssh ${prodUser}@${prodHost}`);
            this.log(`   3. Run: kode deploy --dry-run`);
        } else {
            this.log(`   1. Run: kode deploy --staging`);
        }
        this.log('');
    }

    private generateConfig(opts: {
        appName: string;
        projectType: ProjectType;
        useStaging: boolean;
        stagingPort: number;
        useProduction: boolean;
        prodHost: string;
        prodUser: string;
        prodKeyPath: string;
        strategy: string;
        useHealthCheck: boolean;
        useSlack: boolean;
        useRollback: boolean;
    }): string {
        const lines: string[] = [
            `/** @type {import('@kode-tools/core').DeployConfig} */`,
            `module.exports = {`,
            ``,
            `  project: {`,
            `    name: '${opts.appName}',`,
            `    type: '${opts.projectType}',`,
            `    // version: '1.0.0',        // default: reads from package.json`,
            `    // registry: 'ghcr.io/myorg', // default: Docker Hub`,
            `    dockerfile: './Dockerfile',`,
            `    buildContext: '.',`,
            `  },`,
            ``,
            `  environments: {`,
        ];

        if (opts.useStaging) {
            lines.push(
                `    staging: {`,
                `      target: 'docker-desktop',`,
                `      port: ${opts.stagingPort},`,
                `      // envFile: '.env.staging',`,
                `      restartPolicy: 'unless-stopped',`,
                `    },`,
            );
        }

        if (opts.useProduction) {
            lines.push(
                `    production: {`,
                `      target: 'remote-ssh',`,
                `      strategy: '${opts.strategy}',`,
                `      servers: [`,
                `        {`,
                `          host: process.env.PROD_SERVER_IP,`,
                `          user: '${opts.prodUser}',`,
                `          keyPath: '${opts.prodKeyPath}',`,
                `          label: 'prod-1',`,
                `        },`,
                `      ],`,
                `      port: 3000,`,
                `      // envFile: '.env.production',`,
                `    },`,
            );
        }

        lines.push(`  },`, ``);

        lines.push(
            `  // envVars: {`,
            `  //   required: ['DATABASE_URL', 'JWT_SECRET'],`,
            `  //   shared: { TZ: 'UTC' },`,
            `  //   staging: { NODE_ENV: 'staging', DATABASE_URL: process.env.STAGING_DB },`,
            `  //   production: { NODE_ENV: 'production', DATABASE_URL: process.env.PROD_DB },`,
            `  // },`,
            ``,
        );

        if (opts.useHealthCheck) {
            lines.push(
                `  healthCheck: {`,
                `    endpoint: '/health',`,
                `    retries: 3,`,
                `    retryInterval: 10,`,
                `    startupGrace: 15,`,
                `  },`,
                ``,
            );
        }

        if (opts.useRollback) {
            lines.push(
                `  rollback: {`,
                `    keepVersions: 5,`,
                `    autoRollbackOnFail: true,`,
                `    snapshotBeforeDeploy: true,`,
                `  },`,
                ``,
            );
        }

        lines.push(
            `  hooks: {`,
            `    preBuild: [`,
            `      // 'npm test',`,
            `      // 'npm run lint',`,
            `    ],`,
            `    // postDeploy: {`,
            `    //   staging: ['npm run seed'],`,
            `    //   production: ['npm run migrate'],`,
            `    // },`,
            `  },`,
            ``,
        );

        if (opts.useSlack) {
            lines.push(
                `  notifications: {`,
                `    slack: {`,
                `      webhookUrl: process.env.SLACK_WEBHOOK_URL,`,
                `      channel: '#deployments',`,
                `    },`,
                `  },`,
                ``,
            );
        }

        lines.push(
            `  cli: {`,
            `    defaultEnv: 'staging',`,
            `    confirmProduction: true,   // set false for CI/CD`,
            `    logLevel: 'info',`,
            `  },`,
            ``,
            `};`,
        );

        return lines.join('\n');
    }

    private async detectProjectType(cwd: string): Promise<LocalProjectType> {
        const pkgPath = path.join(cwd, 'package.json');
        if (await fs.pathExists(pkgPath)) {
            const pkg = await fs.readJson(pkgPath) as {
                dependencies?: Record<string, string>;
                devDependencies?: Record<string, string>;
            };
            const deps = {
                ...pkg.dependencies,
                ...pkg.devDependencies,
            };
            if (deps['next']) return 'nextjs';
            if (deps['react']) return 'react';
            if (deps['express'] || deps['fastify'] || deps['koa'] || deps['hapi']) return 'express';
        }
        return 'node';
    }

    private generateDockerfile(type: LocalProjectType, _appName: string, port: number): string {
        switch (type) {
            case 'nextjs':
                return [
                    `# syntax=docker/dockerfile:1`,
                    `FROM node:20-alpine AS base`,
                    ``,
                    `# ── deps ─────────────────────────────────────────────────────────────────────`,
                    `FROM base AS deps`,
                    `RUN apk add --no-cache libc6-compat`,
                    `WORKDIR /app`,
                    `COPY package*.json ./`,
                    `RUN npm ci`,
                    ``,
                    `# ── builder ──────────────────────────────────────────────────────────────────`,
                    `FROM base AS builder`,
                    `WORKDIR /app`,
                    `COPY --from=deps /app/node_modules ./node_modules`,
                    `COPY . .`,
                    `RUN npm run build`,
                    ``,
                    `# ── runner ───────────────────────────────────────────────────────────────────`,
                    `FROM base AS runner`,
                    `WORKDIR /app`,
                    `ENV NODE_ENV=production`,
                    `RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs`,
                    `COPY --from=builder /app/public ./public`,
                    `COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./`,
                    `COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static`,
                    `USER nextjs`,
                    `EXPOSE ${port}`,
                    `ENV PORT=${port}`,
                    `CMD ["node", "server.js"]`,
                ].join('\n');

            case 'react':
                return [
                    `# syntax=docker/dockerfile:1`,
                    ``,
                    `# ── build stage ──────────────────────────────────────────────────────────────`,
                    `FROM node:18-alpine AS build`,
                    ``,
                    `WORKDIR /app`,
                    ``,
                    `COPY package*.json ./`,
                    `RUN npm install`,
                    ``,
                    `COPY . .`,
                    `RUN npm run build`,
                    ``,
                    `# ── production stage ─────────────────────────────────────────────────────────`,
                    `FROM nginx:alpine`,
                    ``,
                    `COPY --from=build /app/dist /usr/share/nginx/html`,
                    ``,
                    `EXPOSE 80`,
                    ``,
                    `CMD ["nginx", "-g", "daemon off;"]`,
                ].join('\n');

            case 'express':
                return [
                    `# syntax=docker/dockerfile:1`,
                    `FROM node:20-alpine`,
                    ``,
                    `WORKDIR /app`,
                    ``,
                    `# Install dependencies`,
                    `COPY package*.json ./`,
                    `RUN npm ci --omit=dev`,
                    ``,
                    `# Copy source`,
                    `COPY . .`,
                    ``,
                    `# Build (if applicable)`,
                    `RUN if [ -f "tsconfig.json" ]; then npm run build 2>/dev/null || true; fi`,
                    ``,
                    `EXPOSE ${port}`,
                    `ENV PORT=${port}`,
                    `ENV NODE_ENV=production`,
                    ``,
                    `# Use a non-root user`,
                    `RUN addgroup -S appgroup && adduser -S appuser -G appgroup`,
                    `USER appuser`,
                    ``,
                    `CMD ["node", "dist/index.js"]`,
                ].join('\n');

            case 'node':
            default:
                return [
                    `# syntax=docker/dockerfile:1`,
                    `FROM node:20-alpine`,
                    ``,
                    `WORKDIR /app`,
                    ``,
                    `COPY package*.json ./`,
                    `RUN npm ci --omit=dev`,
                    ``,
                    `COPY . .`,
                    ``,
                    `EXPOSE ${port}`,
                    `ENV PORT=${port}`,
                    `ENV NODE_ENV=production`,
                    ``,
                    `CMD ["node", "index.js"]`,
                ].join('\n');
        }
    }
}