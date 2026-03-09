import { Command } from '@oclif/core';
import { select, input, confirm } from '@inquirer/prompts';
import fs from 'fs-extra';
import path from 'path';
import { DEFAULT_CONTAINER_PORTS, type ProjectType } from '@kode-tools/core';

// Local labels used only for display / Dockerfile generation
type LocalProjectType = 'nextjs' | 'react' | 'vite' | 'express' | 'nest' | 'node';

/** Map local detected type → canonical ProjectType used in config + port resolution */
const LOCAL_TO_PROJECT_TYPE: Record<LocalProjectType, ProjectType> = {
    nextjs:  'next-app',
    react:   'react-app',
    vite:    'vite-app',
    express: 'node-express',
    nest:    'nest-app',
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
            nextjs:  'Next.js',
            react:   'React (static)',
            vite:    'Vite app',
            express: 'Node / Express',
            nest:    'NestJS',
            node:    'Generic Node.js',
        };
        this.log(`   Detected project type: ${typeLabel[localProjectType]}`);

        // ── Container registry ────────────────────────────────────────────────
        this.log('');
        const useRegistry = await confirm({
            message: 'Push Docker image to a container registry? (Docker Hub, GHCR, etc.)',
            default: false,
        });

        let registry = '';
        if (useRegistry) {
            const registryChoice = await select({
                message: 'Choose registry:',
                choices: [
                    { name: 'Docker Hub  (docker.io/username)', value: 'dockerhub' },
                    { name: 'GitHub Container Registry  (ghcr.io/username)', value: 'ghcr' },
                    { name: 'Custom registry URL', value: 'custom' },
                ],
            });

            if (registryChoice === 'dockerhub') {
                const username = await input({
                    message: 'Docker Hub username:',
                    validate: (v) => v.trim().length > 0 ? true : 'Username is required',
                });
                registry = `docker.io/${username.trim()}`;
            } else if (registryChoice === 'ghcr') {
                const username = await input({
                    message: 'GitHub username or org:',
                    validate: (v) => v.trim().length > 0 ? true : 'Username is required',
                });
                registry = `ghcr.io/${username.trim()}`;
            } else {
                registry = await input({
                    message: 'Registry URL (e.g. registry.example.com/myorg):',
                    validate: (v) => v.trim().length > 0 ? true : 'Registry URL is required',
                });
                registry = registry.trim();
            }
            this.log(`   Registry: ${registry}/${appName}`);
        }

        // ── Staging / Production ──────────────────────────────────────────────
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
            registry,
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
                this.log(`✅ Created: Dockerfile`);

                // ── .dockerignore ─────────────────────────────────────────────
                const dockerignorePath = path.join(cwd, '.dockerignore');
                if (!(await fs.pathExists(dockerignorePath))) {
                    const dockerignore = this.generateDockerignore(localProjectType);
                    await fs.writeFile(dockerignorePath, dockerignore, 'utf-8');
                    this.log(`✅ Created: .dockerignore\n`);
                } else {
                    this.log(`   .dockerignore already exists — skipping.\n`);
                }
            } else {
                this.log('⚠️  Skipped Dockerfile generation. Remember to create one before deploying.\n');
            }
        } else {
            this.log('🐳 Dockerfile already exists — skipping generation.\n');
        }

        this.log('   Next steps:\n');
        if (useRegistry) {
            this.log(`   1. Log in to your registry: docker login`);
        }
        if (useProduction) {
            this.log(`   ${useRegistry ? '2' : '1'}. Set PROD_SERVER_IP in your environment`);
            this.log(`   ${useRegistry ? '3' : '2'}. Ensure SSH access: ssh ${prodUser}@${prodHost}`);
            this.log(`   ${useRegistry ? '4' : '3'}. Run: kode deploy --dry-run`);
        } else {
            this.log(`   ${useRegistry ? '2' : '1'}. Run: kode deploy --staging`);
        }
        this.log('');
    }

    private generateConfig(opts: {
        appName: string;
        projectType: ProjectType;
        registry: string;
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
        ];

        if (opts.registry) {
            lines.push(`    registry: '${opts.registry}', // image will be tagged as ${opts.registry}/${opts.appName}:<version>`);
        } else {
            lines.push(`    // registry: 'docker.io/myuser', // uncomment to push to Docker Hub`);
            lines.push(`    // registry: 'ghcr.io/myorg',   // or to GitHub Container Registry`);
        }

        lines.push(
            `    dockerfile: './Dockerfile',`,
            `    buildContext: '.',`,
            `  },`,
            ``,
            `  environments: {`,
        );

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
            if (deps['@nestjs/core'] || deps['@nestjs/common']) return 'nest';
            if (deps['vite'] && !deps['react']) return 'vite';
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
                    `# ─────────────────────────────────────────────────────────────────────────────`,
                    `# Next.js — multi-stage build (standalone output)`,
                    `# Prerequisites: add { output: 'standalone' } to next.config.js`,
                    `# ─────────────────────────────────────────────────────────────────────────────`,
                    ``,
                    `FROM node:20-alpine AS base`,
                    `RUN apk add --no-cache libc6-compat`,
                    ``,
                    `# ── Stage 1: install deps ─────────────────────────────────────────────────────`,
                    `FROM base AS deps`,
                    `WORKDIR /app`,
                    `COPY package*.json ./`,
                    `RUN npm ci`,
                    ``,
                    `# ── Stage 2: build ───────────────────────────────────────────────────────────`,
                    `FROM base AS builder`,
                    `WORKDIR /app`,
                    `COPY --from=deps /app/node_modules ./node_modules`,
                    `COPY . .`,
                    `ENV NEXT_TELEMETRY_DISABLED=1`,
                    `RUN npm run build`,
                    ``,
                    `# ── Stage 3: production runner ───────────────────────────────────────────────`,
                    `FROM base AS runner`,
                    `WORKDIR /app`,
                    `ENV NODE_ENV=production`,
                    `ENV NEXT_TELEMETRY_DISABLED=1`,
                    ``,
                    `RUN addgroup --system --gid 1001 nodejs`,
                    `RUN adduser  --system --uid 1001 nextjs`,
                    ``,
                    `COPY --from=builder /app/public ./public`,
                    `COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./`,
                    `COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static`,
                    ``,
                    `USER nextjs`,
                    ``,
                    `EXPOSE ${port}`,
                    `ENV PORT=${port}`,
                    `ENV HOSTNAME="0.0.0.0"`,
                    ``,
                    `HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \\`,
                    `    CMD wget -qO- http://localhost:${port}/api/health || exit 1`,
                    ``,
                    `CMD ["node", "server.js"]`,
                ].join('\n');

            case 'react':
                return [
                    `# syntax=docker/dockerfile:1`,
                    `# ─────────────────────────────────────────────────────────────────────────────`,
                    `# React (Create React App / CRA) — build then serve with Nginx`,
                    `# ─────────────────────────────────────────────────────────────────────────────`,
                    ``,
                    `# ── Stage 1: build ───────────────────────────────────────────────────────────`,
                    `FROM node:20-alpine AS build`,
                    `WORKDIR /app`,
                    ``,
                    `COPY package*.json ./`,
                    `RUN npm ci`,
                    ``,
                    `COPY . .`,
                    `RUN npm run build`,
                    ``,
                    `# ── Stage 2: serve with Nginx ────────────────────────────────────────────────`,
                    `FROM nginx:1.27-alpine AS runner`,
                    ``,
                    `# Remove default Nginx config and copy our own`,
                    `RUN rm /etc/nginx/conf.d/default.conf`,
                    `COPY --from=build /app/build /usr/share/nginx/html`,
                    ``,
                    `# Simple SPA config with gzip`,
                    `RUN printf 'server {\\n\\`,
                    `    listen 80;\\n\\`,
                    `    root /usr/share/nginx/html;\\n\\`,
                    `    gzip on;\\n\\`,
                    `    location / { try_files $uri /index.html; }\\n\\`,
                    `}\\n' > /etc/nginx/conf.d/app.conf`,
                    ``,
                    `EXPOSE 80`,
                    ``,
                    `HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\`,
                    `    CMD wget -qO- http://localhost:80/ || exit 1`,
                    ``,
                    `CMD ["nginx", "-g", "daemon off;"]`,
                ].join('\n');

            case 'vite':
                return [
                    `# syntax=docker/dockerfile:1`,
                    `# ─────────────────────────────────────────────────────────────────────────────`,
                    `# Vite app — build then serve with Nginx`,
                    `# ─────────────────────────────────────────────────────────────────────────────`,
                    ``,
                    `# ── Stage 1: build ───────────────────────────────────────────────────────────`,
                    `FROM node:20-alpine AS build`,
                    `WORKDIR /app`,
                    ``,
                    `COPY package*.json ./`,
                    `RUN npm ci`,
                    ``,
                    `COPY . .`,
                    `RUN npm run build`,
                    ``,
                    `# ── Stage 2: serve with Nginx ────────────────────────────────────────────────`,
                    `FROM nginx:1.27-alpine AS runner`,
                    ``,
                    `RUN rm /etc/nginx/conf.d/default.conf`,
                    `COPY --from=build /app/dist /usr/share/nginx/html`,
                    ``,
                    `RUN printf 'server {\\n\\`,
                    `    listen 80;\\n\\`,
                    `    root /usr/share/nginx/html;\\n\\`,
                    `    gzip on;\\n\\`,
                    `    location / { try_files $uri /index.html; }\\n\\`,
                    `}\\n' > /etc/nginx/conf.d/app.conf`,
                    ``,
                    `EXPOSE 80`,
                    ``,
                    `HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\`,
                    `    CMD wget -qO- http://localhost:80/ || exit 1`,
                    ``,
                    `CMD ["nginx", "-g", "daemon off;"]`,
                ].join('\n');

            case 'nest':
                return [
                    `# syntax=docker/dockerfile:1`,
                    `# ─────────────────────────────────────────────────────────────────────────────`,
                    `# NestJS — multi-stage TypeScript build`,
                    `# ─────────────────────────────────────────────────────────────────────────────`,
                    ``,
                    `# ── Stage 1: build ───────────────────────────────────────────────────────────`,
                    `FROM node:20-alpine AS build`,
                    `WORKDIR /app`,
                    ``,
                    `COPY package*.json ./`,
                    `RUN npm ci`,
                    ``,
                    `COPY . .`,
                    `RUN npm run build`,
                    ``,
                    `# ── Stage 2: production image ────────────────────────────────────────────────`,
                    `FROM node:20-alpine AS runner`,
                    `WORKDIR /app`,
                    ``,
                    `ENV NODE_ENV=production`,
                    ``,
                    `# Install only production deps`,
                    `COPY package*.json ./`,
                    `RUN npm ci --omit=dev && npm cache clean --force`,
                    ``,
                    `COPY --from=build /app/dist ./dist`,
                    ``,
                    `# Non-root user`,
                    `RUN addgroup -S appgroup && adduser -S appuser -G appgroup`,
                    `USER appuser`,
                    ``,
                    `EXPOSE ${port}`,
                    `ENV PORT=${port}`,
                    ``,
                    `HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \\`,
                    `    CMD wget -qO- http://localhost:${port}/health || exit 1`,
                    ``,
                    `CMD ["node", "dist/main"]`,
                ].join('\n');

            case 'express':
                return [
                    `# syntax=docker/dockerfile:1`,
                    `# ─────────────────────────────────────────────────────────────────────────────`,
                    `# Node / Express — multi-stage build`,
                    `# ─────────────────────────────────────────────────────────────────────────────`,
                    ``,
                    `# ── Stage 1: build ───────────────────────────────────────────────────────────`,
                    `FROM node:20-alpine AS build`,
                    `WORKDIR /app`,
                    ``,
                    `COPY package*.json ./`,
                    `RUN npm ci`,
                    ``,
                    `COPY . .`,
                    `# Build TypeScript if applicable`,
                    `RUN if [ -f "tsconfig.json" ]; then npm run build 2>/dev/null || true; fi`,
                    ``,
                    `# ── Stage 2: production image ────────────────────────────────────────────────`,
                    `FROM node:20-alpine AS runner`,
                    `WORKDIR /app`,
                    ``,
                    `ENV NODE_ENV=production`,
                    ``,
                    `# Install only production deps`,
                    `COPY package*.json ./`,
                    `RUN npm ci --omit=dev && npm cache clean --force`,
                    ``,
                    `COPY --from=build /app/dist ./dist`,
                    ``,
                    `# Non-root user`,
                    `RUN addgroup -S appgroup && adduser -S appuser -G appgroup`,
                    `USER appuser`,
                    ``,
                    `EXPOSE ${port}`,
                    `ENV PORT=${port}`,
                    ``,
                    `HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\`,
                    `    CMD wget -qO- http://localhost:${port}/health || exit 1`,
                    ``,
                    `CMD ["node", "dist/index.js"]`,
                ].join('\n');

            case 'node':
            default:
                return [
                    `# syntax=docker/dockerfile:1`,
                    `# ─────────────────────────────────────────────────────────────────────────────`,
                    `# Generic Node.js`,
                    `# ─────────────────────────────────────────────────────────────────────────────`,
                    ``,
                    `FROM node:20-alpine AS runner`,
                    `WORKDIR /app`,
                    ``,
                    `ENV NODE_ENV=production`,
                    ``,
                    `COPY package*.json ./`,
                    `RUN npm ci --omit=dev && npm cache clean --force`,
                    ``,
                    `COPY . .`,
                    ``,
                    `# Non-root user`,
                    `RUN addgroup -S appgroup && adduser -S appuser -G appgroup`,
                    `USER appuser`,
                    ``,
                    `EXPOSE ${port}`,
                    `ENV PORT=${port}`,
                    ``,
                    `HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\`,
                    `    CMD wget -qO- http://localhost:${port}/ || exit 1`,
                    ``,
                    `CMD ["node", "index.js"]`,
                ].join('\n');
        }
    }

    private generateDockerignore(type: LocalProjectType): string {
        const base = [
            `# ── Version control ──────────────────────────────────────────────────────────`,
            `.git`,
            `.gitignore`,
            `.gitattributes`,
            ``,
            `# ── Node ─────────────────────────────────────────────────────────────────────`,
            `node_modules`,
            `npm-debug.log*`,
            `yarn-debug.log*`,
            `yarn-error.log*`,
            ``,
            `# ── Build output ─────────────────────────────────────────────────────────────`,
            `dist`,
            `build`,
            `.next`,
            `.nuxt`,
            ``,
            `# ── Environment / secrets ────────────────────────────────────────────────────`,
            `.env`,
            `.env.*`,
            `!.env.example`,
            ``,
            `# ── Editor / OS ──────────────────────────────────────────────────────────────`,
            `.DS_Store`,
            `Thumbs.db`,
            `.idea`,
            `.vscode`,
            `*.swp`,
            ``,
            `# ── Tests / CI ───────────────────────────────────────────────────────────────`,
            `coverage`,
            `.nyc_output`,
            `*.test.ts`,
            `*.spec.ts`,
            `*.test.js`,
            `*.spec.js`,
        ];

        if (type === 'nextjs') {
            base.push(``, `# ── Next.js ──────────────────────────────────────────────────────────────────`, `.next`, `out`);
        }

        if (type === 'react' || type === 'vite') {
            base.push(``, `# ── Storybook / docs ─────────────────────────────────────────────────────────`, `storybook-static`, `docs`);
        }

        base.push(``, `# ── Docker ───────────────────────────────────────────────────────────────────`, `Dockerfile*`, `.dockerignore`);

        return base.join('\n') + '\n';
    }
}
