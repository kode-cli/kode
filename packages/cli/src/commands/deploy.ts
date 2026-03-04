import { Command, Flags } from '@oclif/core';
import {
    loadDeployConfig,
    runPreflight,
    buildImage,
    pushImage,
    deployStaging,
    deployProduction,
    runHooks,
    sendNotification,
    DeployHistory, BuildResult,
} from '@kode-tools/core';
import { confirm } from '@inquirer/prompts';
import { render } from 'ink';
import React from 'react';
import { Spinner } from '../ui/Spinner.js';

export default class Deploy extends Command {
    static description = 'Deploy your app to staging (Docker Desktop) or production (remote SSH)';

    static examples = [
        '$ kode deploy',
        '$ kode deploy --staging',
        '$ kode deploy --prod',
        '$ kode deploy --dry-run',
        '$ kode deploy --staging --no-check',
    ];

    static flags = {
        staging: Flags.boolean({
            description: 'Deploy to staging environment',
            default: false,
        }),
        prod: Flags.boolean({
            description: 'Deploy to production environment',
            default: false,
        }),
        'dry-run': Flags.boolean({
            description: 'Validate config and connections without deploying',
            default: false,
        }),
        'no-check': Flags.boolean({
            description: 'Skip pre-deploy quality checks',
            default: false,
        }),
        'no-hooks': Flags.boolean({
            description: 'Skip all hooks',
            default: false,
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Deploy);
        const cwd = process.cwd();
        const deployStart = Date.now();

        // ── 1. Load config ────────────────────────────────────────────────────
        let config;
        try {
            config = await loadDeployConfig(cwd);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.log(`\n❌  ${msg}\n`);
            process.exitCode = 1;
            return;
        }

        // ── 2. Resolve environment ────────────────────────────────────────────
        let environment: 'staging' | 'production';

        if (flags.prod) {
            environment = 'production';
        } else if (flags.staging) {
            environment = 'staging';
        } else {
            environment = config.cli.defaultEnv;
        }

        const dryRun = flags['dry-run'] || config.cli.dryRun;

        this.log(`\n🚀 Kode Deploy`);
        this.log(`   App:         ${config.project.name}`);
        this.log(`   Environment: ${environment}`);
        this.log(`   Dry run:     ${dryRun ? 'yes' : 'no'}`);

        // ── 3. Production confirmation ────────────────────────────────────────
        if (environment === 'production' && config.cli.confirmProduction && !dryRun) {
            this.log('');
            const confirmed = await confirm({
                message: `⚠️  Deploy to PRODUCTION? This affects live users.`,
                default: false,
            });
            if (!confirmed) {
                this.log('\n🚫 Aborted.\n');
                return;
            }
        }

        const log = (msg: string) => this.log(msg);
        const history = new DeployHistory(cwd, config.rollback?.historyFile);
        const deployId = history.generateId();

        // ── 4. Send start notification ────────────────────────────────────────
        await sendNotification(config, {
            event: 'start',
            environment,
            appName: config.project.name,
            version: 'pending',
            imageTag: 'pending',
        });

        try {
            // ── 5. Pre-deploy checks ──────────────────────────────────────────
            if (!flags['no-check']) {
                const preflight = await runPreflight(config, environment, log, cwd);
                if (!preflight.passed) {
                    this.log('❌ Pre-deploy checks failed:\n');
                    preflight.failures.forEach((f) => this.log(`   • ${f}`));
                    this.log('');
                    process.exitCode = 1;
                    return;
                }
            }

            // ── 6. Build Docker image ─────────────────────────────────────────
            let build: BuildResult | null = null;

            await this.runWithSpinner('Building Docker image…', async () => {
                build = await buildImage(config, environment, log, cwd);
            });

            if (!build) throw new Error('Build failed — no output from docker build.');

// TypeScript now knows build is BuildResult from here down
            const buildResult = build as BuildResult;

// ── 7. Post-build hooks ───────────────────────────────────────────────────
            if (!flags['no-hooks'] && config.hooks?.postBuild) {
                await runHooks(config.hooks.postBuild, {
                    imageTag: buildResult.imageTag,
                    version: buildResult.version,
                    gitSha: buildResult.gitSha,
                    environment,
                    cwd,
                }, 'post-build', log);
            }

// ── 8. Push image to registry (production only with registry) ─────
            if (environment === 'production' && config.project.registry && !dryRun) {
                await this.runWithSpinner('Pushing image to registry…', async () => {
                    await pushImage(buildResult.imageTag, log, cwd);
                });
            }

// ── 9. Pre-deploy hooks ───────────────────────────────────────────────────
            if (!flags['no-hooks'] && config.hooks?.preDeploy) {
                await runHooks(config.hooks.preDeploy, {
                    imageTag: buildResult.imageTag,
                    version: buildResult.version,
                    gitSha: buildResult.gitSha,
                    environment,
                    cwd,
                }, 'pre-deploy', log);
            }

// ── 10. Deploy ────────────────────────────────────────────────────────────
            let deployedServers: string[] = [];

            if (environment === 'staging') {
                await this.runWithSpinner('Deploying to staging…', async () => {
                    await deployStaging(config, buildResult, log, cwd, dryRun);
                });
            } else {
                await this.runWithSpinner('Deploying to production…', async () => {
                    deployedServers = await deployProduction(config, buildResult, log, cwd, dryRun);
                });
            }

// ── 11. Post-deploy hooks ─────────────────────────────────────────────────
            if (!flags['no-hooks'] && config.hooks?.postDeploy) {
                const postDeploy = config.hooks.postDeploy;
                const cmds = Array.isArray(postDeploy)
                    ? postDeploy
                    : (postDeploy as Record<string, string[]>)[environment] ?? [];

                await runHooks(cmds, {
                    imageTag: buildResult.imageTag,
                    version: buildResult.version,
                    gitSha: buildResult.gitSha,
                    environment,
                    cwd,
                }, 'post-deploy', log);
            }

            const duration = Date.now() - deployStart;

// ── 12. Record history ────────────────────────────────────────────────────
            if (!dryRun) {
                await history.append({
                    id: deployId,
                    version: buildResult.version,
                    imageTag: buildResult.imageTag,
                    environment,
                    timestamp: new Date().toISOString(),
                    duration,
                    status: 'success',
                    gitSha: buildResult.gitSha,
                    deployedBy: process.env.USER ?? 'unknown',
                    servers: deployedServers,
                });
            }

// ── 13. On-success hooks ──────────────────────────────────────────────────
            if (!flags['no-hooks'] && config.hooks?.onSuccess) {
                await runHooks(config.hooks.onSuccess, {
                    imageTag: buildResult.imageTag,
                    version: buildResult.version,
                    gitSha: buildResult.gitSha,
                    environment,
                    cwd,
                }, 'on-success', log);
            }

// ── 14. Success notification ──────────────────────────────────────────────
            await sendNotification(config, {
                event: 'success',
                environment,
                appName: config.project.name,
                version: buildResult.version,
                imageTag: buildResult.imageTag,
                duration,
                servers: deployedServers,
            });

            this.log(`\n✅ Deploy complete! (${(duration / 1000).toFixed(1)}s)`);
            if (environment === 'staging') {
                const port = config.environments.staging?.port ?? 3000;
                this.log(`   🌐 http://localhost:${port}`);
            }
            this.log('');

        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const duration = Date.now() - deployStart;

            this.log(`\n❌ Deploy failed: ${msg.split('\n')[0]}\n`);

            // On-failure hooks
            if (!flags['no-hooks'] && config.hooks?.onFailure) {
                await runHooks(config.hooks.onFailure, {
                    imageTag: '',
                    version: '',
                    gitSha: '',
                    environment,
                    cwd,
                }, 'on-failure', log).catch(() => {});
            }

            // Record failure
            await history.append({
                id: deployId,
                version: 'failed',
                imageTag: 'failed',
                environment,
                timestamp: new Date().toISOString(),
                duration,
                status: 'failure',
                gitSha: '',
                deployedBy: process.env.USER ?? 'unknown',
                notes: msg,
            });

            // Failure notification
            await sendNotification(config, {
                event: 'failure',
                environment,
                appName: config.project.name,
                version: 'failed',
                imageTag: 'failed',
                duration,
                error: msg.split('\n')[0],
            });

            process.exitCode = 1;
        }
    }

    private async runWithSpinner(label: string, fn: () => Promise<void>): Promise<void> {
        const { unmount, rerender } = render(React.createElement(Spinner, { label }));
        try {
            await fn();
            rerender(React.createElement(Spinner, { label, done: true }));
        } catch (err) {
            rerender(React.createElement(Spinner, { label, failed: true }));
            unmount();
            throw err;
        }
        await new Promise((r) => setTimeout(r, 150));
        unmount();
    }
}