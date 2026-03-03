import { Command, Flags } from '@oclif/core';
import { loadDeployConfig } from '@kode/core';
import { execa } from 'execa';

export default class DeployStatus extends Command {
    static description = 'Show the status of running containers in each environment';

    static examples = [
        '$ kode deploy:status',
        '$ kode deploy:status --env staging',
    ];

    static flags = {
        env: Flags.string({
            char: 'e',
            description: 'Environment to check',
            options: ['staging', 'production'],
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(DeployStatus);
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

        const appName = config.project.name;
        const checkStaging = !flags.env || flags.env === 'staging';
        const checkProd = !flags.env || flags.env === 'production';

        this.log('\n  📡 Deployment Status\n');

        // ── Staging ───────────────────────────────────────────────────────────
        if (checkStaging && config.environments.staging) {
            const containerName = config.environments.staging.containerName ?? `${appName}-staging`;
            const port = config.environments.staging.port ?? 3000;

            this.log(`  🐳 ${this.bold('Staging')} (Docker Desktop)`);

            try {
                const { stdout } = await execa('docker', [
                    'inspect', containerName,
                    '--format', '{{.State.Status}} {{.State.StartedAt}}',
                ]);
                const [status, startedAt] = stdout.trim().split(' ');
                const upSince = new Date(startedAt).toLocaleString();

                const icon = status === 'running' ? '✅' : '❌';
                this.log(`     ${icon} ${containerName}: ${status}`);
                this.log(`     Started: ${this.dim(upSince)}`);
                this.log(`     URL: ${this.dim(`http://localhost:${port}`)}`);

                // Quick health check
                if (status === 'running' && config.healthCheck) {
                    try {
                        const res = await fetch(`http://localhost:${port}${config.healthCheck.endpoint}`);
                        const healthIcon = res.ok ? '✅' : '⚠️';
                        this.log(`     Health: ${healthIcon} HTTP ${res.status}`);
                    } catch {
                        this.log(`     Health: ⚠️  unreachable`);
                    }
                }
            } catch {
                this.log(`     ❌ ${containerName}: not running`);
            }

            this.log('');
        }

        // ── Production ────────────────────────────────────────────────────────
        if (checkProd && config.environments.production) {
            const servers = config.environments.production.servers;
            const port = config.environments.production.port ?? 3000;
            const containerName = `${appName}-production`;

            this.log(`  🚀 ${this.bold('Production')} (Remote SSH)`);

            for (const server of servers) {
                const label = server.label ?? server.host;
                this.log(`\n     Server: ${label}`);

                try {
                    const sshArgs = [
                        ...(server.keyPath ? ['-i', server.keyPath] : []),
                        '-o', 'StrictHostKeyChecking=no',
                        '-o', 'ConnectTimeout=5',
                        '-p', String(server.port),
                        `${server.user}@${server.host}`,
                        `docker inspect ${containerName} --format '{{.State.Status}} {{.State.StartedAt}}' 2>/dev/null || echo 'not-found'`,
                    ];

                    const { stdout } = await execa('ssh', sshArgs);

                    if (stdout.trim() === 'not-found') {
                        this.log(`     ❌ ${containerName}: not running`);
                    } else {
                        const [status, startedAt] = stdout.trim().split(' ');
                        const upSince = new Date(startedAt).toLocaleString();
                        const icon = status === 'running' ? '✅' : '❌';
                        this.log(`     ${icon} ${containerName}: ${status}`);
                        this.log(`     Started: ${this.dim(upSince)}`);
                    }
                } catch {
                    this.log(`     ⚠️  Could not connect to ${label}`);
                    this.log(`     ${this.dim(`ssh ${server.user}@${server.host} failed`)}`);
                }
            }

            this.log('');
        }
    }

    private bold(text: string): string { return `\x1b[1m${text}\x1b[0m`; }
    private dim(text: string): string { return `\x1b[2m${text}\x1b[0m`; }
}