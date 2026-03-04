import { Command, Flags } from '@oclif/core';
import { loadDeployConfig, DeployHistory, sendNotification } from '@kode-tools/core';
import { select } from '@inquirer/prompts';
import { runWithSpinner } from '../utils/spinner.js';
import { toErrorMessage } from '../utils/errors.js';
import { execa } from 'execa';

export default class Rollback extends Command {
    static description = 'Roll back to a previous deployment';

    static examples = [
        '$ kode rollback',
        '$ kode rollback --env production',
        '$ kode rollback --version v1.2.3-a1b2c3d',
    ];

    static flags = {
        env: Flags.string({
            char: 'e',
            description: 'Environment to roll back',
            options: ['staging', 'production'],
        }),
        version: Flags.string({
            char: 'v',
            description: 'Specific image tag to roll back to',
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Rollback);
        const cwd = process.cwd();

        let config;
        try {
            config = await loadDeployConfig(cwd);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.log(`\n❌  ${msg}\n`);
            process.exitCode = 1;
            return;
        }

        const environment = (flags.env as 'staging' | 'production') ?? config.cli.defaultEnv;
        const history = new DeployHistory(cwd, config.rollback?.historyFile);

        // ── Get rollback target ───────────────────────────────────────────────
        let targetImageTag = flags.version;

        if (!targetImageTag) {
            const records = await history.getLatest(environment, config.rollback?.keepVersions ?? 5);

            if (records.length < 2) {
                this.log('\n❌  No previous deployments to roll back to.\n');
                process.exitCode = 1;
                return;
            }

            // Skip the current (first) record
            const choices = records.slice(1).map((r) => ({
                name: `${r.version} — ${new Date(r.timestamp).toLocaleString()} (${r.status})`,
                value: r.imageTag,
                description: `Servers: ${r.servers?.join(', ') ?? 'local'} · Duration: ${(r.duration / 1000).toFixed(1)}s`,
            }));

            this.log(`\n🔄 Rolling back ${environment}…\n`);
            targetImageTag = await select({
                message: 'Choose version to roll back to:',
                choices,
            });
        }

        this.log(`\n   Rolling back to: ${targetImageTag}`);

        // ── Perform rollback ──────────────────────────────────────────────────
        const appName = config.project.name;

        try {
            if (environment === 'staging') {
                await this.rollbackStaging(config, targetImageTag, appName);
            } else {
                await this.rollbackProduction(config, targetImageTag, appName);
            }

            // Mark current as rolled-back in history
            const records = await history.getLatest(environment, 1);
            if (records[0]) {
                await history.updateStatus(records[0].id, 'rolled-back');
            }

            // Record rollback
            await history.append({
                id: history.generateId(),
                version: `rollback-to-${targetImageTag.split(':').pop()}`,
                imageTag: targetImageTag,
                environment,
                timestamp: new Date().toISOString(),
                duration: 0,
                status: 'success',
                gitSha: '',
                deployedBy: process.env.USER ?? 'unknown',
                notes: `Rollback to ${targetImageTag}`,
            });

            await sendNotification(config, {
                event: 'rollback',
                environment,
                appName,
                version: targetImageTag.split(':').pop() ?? 'unknown',
                imageTag: targetImageTag,
            });

            this.log(`\n✅ Rolled back successfully!\n`);

        } catch (err) {
            const msg = toErrorMessage(err);
            this.log(`\n❌ Rollback failed: ${msg}\n`);
            process.exitCode = 1;
        }
    }

    private async rollbackStaging(
        config: import('@kode-tools/core').DeployConfig,
        imageTag: string,
        appName: string
    ): Promise<void> {
        const containerName = config.environments.staging?.containerName ?? `${appName}-staging`;
        const port = config.environments.staging?.port ?? 3000;

        await runWithSpinner('Rolling back staging…', async () => {
            await execa('docker', ['stop', containerName], { reject: false });
            await execa('docker', ['rm', containerName], { reject: false });
            await execa('docker', [
                'run', '-d',
                '--name', containerName,
                '-p', `${port}:3000`,
                '--restart', 'unless-stopped',
                imageTag,
            ]);
        });

        this.log(`   🌐 http://localhost:${port}`);
    }

    private async rollbackProduction(
        config: import('@kode-tools/core').DeployConfig,
        imageTag: string,
        appName: string
    ): Promise<void> {
        const servers = config.environments.production?.servers ?? [];
        const port = config.environments.production?.port ?? 3000;
        const containerName = `${appName}-production`;

        for (const server of servers) {
            const label = server.label ?? server.host;
            await runWithSpinner(`Rolling back ${label}…`, async () => {
                const sshArgs = [
                    ...(server.keyPath ? ['-i', server.keyPath] : []),
                    '-o', 'StrictHostKeyChecking=no',
                    '-p', String(server.port),
                    `${server.user}@${server.host}`,
                ];

                await execa('ssh', [...sshArgs, `docker stop ${containerName} 2>/dev/null || true`]);
                await execa('ssh', [...sshArgs, `docker rm ${containerName} 2>/dev/null || true`]);
                await execa('ssh', [...sshArgs,
                    `docker run -d --name ${containerName} -p ${port}:3000 --restart unless-stopped ${imageTag}`
                ]);
            });
        }
    }
}