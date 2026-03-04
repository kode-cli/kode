import { Command, Flags } from '@oclif/core';
import { loadDeployConfig, DeployHistory } from '@kode-tools/core';

export default class History extends Command {
    static description = 'Show deployment history';

    static examples = [
        '$ kode history',
        '$ kode history --env production',
        '$ kode history --count 20',
    ];

    static flags = {
        env: Flags.string({
            char: 'e',
            description: 'Filter by environment',
            options: ['staging', 'production'],
        }),
        count: Flags.integer({
            char: 'n',
            description: 'Number of records to show',
            default: 10,
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(History);
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

        const history = new DeployHistory(cwd, config.rollback?.historyFile);
        const environment = flags.env as 'staging' | 'production' | undefined;

        const records = environment
            ? await history.getLatest(environment, flags.count)
            : (await history.load()).slice(0, flags.count);

        if (records.length === 0) {
            this.log('\n📭 No deployment history found.\n');
            return;
        }

        this.log('\n  📋 Deployment History\n');
        this.log('  ' + '─'.repeat(72));

        for (const r of records) {
            const date = new Date(r.timestamp).toLocaleString();
            const statusIcon = r.status === 'success' ? '✅'
                : r.status === 'failure' ? '❌' : '🔄';
            const envBadge = r.environment === 'production'
                ? this.red('prod')
                : this.green('staging');
            const duration = r.duration > 0 ? `${(r.duration / 1000).toFixed(1)}s` : '—';

            this.log(`\n  ${statusIcon} ${this.bold(r.version.slice(0, 30))}`);
            this.log(`     ${this.dim(r.id)}`);
            this.log(`     Environment: ${envBadge} · Duration: ${duration} · By: ${r.deployedBy}`);
            this.log(`     Image: ${this.dim(r.imageTag)}`);
            this.log(`     Date:  ${this.dim(date)}`);
            if (r.servers?.length) {
                this.log(`     Servers: ${this.dim(r.servers.join(', '))}`);
            }
            if (r.notes) {
                this.log(`     Notes: ${this.dim(r.notes)}`);
            }
        }

        this.log('\n  ' + '─'.repeat(72));
        this.log(`\n  ${records.length} record(s) shown. Run \`kode rollback\` to revert.\n`);
    }

    private bold(text: string): string { return `\x1b[1m${text}\x1b[0m`; }
    private dim(text: string): string { return `\x1b[2m${text}\x1b[0m`; }
    private green(text: string): string { return `\x1b[32m${text}\x1b[0m`; }
    private red(text: string): string { return `\x1b[31m${text}\x1b[0m`; }
}