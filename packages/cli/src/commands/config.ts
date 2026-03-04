import { Command, Args } from '@oclif/core';
import {
    readGlobalConfig,
    setGlobalConfigValue,
    getGlobalConfigValue,
    deleteGlobalConfigValue,
    getConfigFilePath,
} from '@kode/core';

const SENSITIVE = new Set(['ANTHROPIC_API_KEY', 'SLACK_WEBHOOK_URL', 'PROD_JWT_SECRET']);

export default class Config extends Command {
    static description = 'Manage global Kode configuration (~/.kode/config.json)';

    static examples = [
        '$ kode config set ANTHROPIC_API_KEY sk-ant-...',
        '$ kode config get ANTHROPIC_API_KEY',
        '$ kode config list',
        '$ kode config delete ANTHROPIC_API_KEY',
    ];

    static args = {
        action: Args.string({
            required: true,
            description: 'Action: set, get, list, delete',
            options: ['set', 'get', 'list', 'delete'],
        }),
        key:   Args.string({ required: false, description: 'Config key' }),
        value: Args.string({ required: false, description: 'Config value' }),
    };

    async run(): Promise<void> {
        const { args } = await this.parse(Config);
        switch (args.action) {
            case 'set':    await this.handleSet(args.key, args.value); break;
            case 'get':    await this.handleGet(args.key); break;
            case 'list':   await this.handleList(); break;
            case 'delete': await this.handleDelete(args.key); break;
        }
    }

    // ── set ───────────────────────────────────────────────────────────────────

    private async handleSet(key?: string, value?: string): Promise<void> {
        if (!key || !value) {
            this.log('\n❌  Usage: kode config set <KEY> <VALUE>');
            this.log('   Example: kode config set ANTHROPIC_API_KEY sk-ant-...\n');
            process.exitCode = 1;
            return;
        }
        await setGlobalConfigValue(key, value);
        const masked = SENSITIVE.has(key) ? this.mask(value) : value;
        this.log(`\n✅ Saved: ${key} = ${masked}`);
        this.log(`   Stored in: ${getConfigFilePath()}`);
        this.log(`   Loaded automatically in every terminal from now on.\n`);
    }

    // ── get ───────────────────────────────────────────────────────────────────

    private async handleGet(key?: string): Promise<void> {
        if (!key) {
            this.log('\n❌  Usage: kode config get <KEY>\n');
            process.exitCode = 1;
            return;
        }
        const value = await getGlobalConfigValue(key);
        if (value === undefined) {
            this.log(`\n❌  "${key}" is not set.`);
            this.log(`   Run: kode config set ${key} <value>\n`);
            process.exitCode = 1;
            return;
        }
        const display = SENSITIVE.has(key) ? this.mask(value) : value;
        this.log(`\n  ${key} = ${display}\n`);
    }

    // ── list ──────────────────────────────────────────────────────────────────

    private async handleList(): Promise<void> {
        const config = await readGlobalConfig();
        const entries = Object.entries(config);

        this.log(`\n  📁 ${getConfigFilePath()}\n`);

        if (entries.length === 0) {
            this.log('  No config values stored.\n');
            this.log('  Get started: kode config set ANTHROPIC_API_KEY sk-ant-...\n');
            return;
        }

        this.log('  ' + '─'.repeat(55));
        for (const [k, v] of entries) {
            const display = SENSITIVE.has(k) ? this.mask(v ?? '') : v;
            this.log(`  ${k.padEnd(32)} ${display}`);
        }
        this.log('  ' + '─'.repeat(55) + '\n');
    }

    // ── delete ────────────────────────────────────────────────────────────────

    private async handleDelete(key?: string): Promise<void> {
        if (!key) {
            this.log('\n❌  Usage: kode config delete <KEY>\n');
            process.exitCode = 1;
            return;
        }
        const existing = await getGlobalConfigValue(key);
        if (existing === undefined) {
            this.log(`\n⚠️  "${key}" was not set.\n`);
            return;
        }
        await deleteGlobalConfigValue(key);
        this.log(`\n✅ Deleted: ${key}\n`);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private mask(v: string): string {
        if (v.length <= 8) return '••••••••';
        return v.slice(0, 6) + '••••••••' + v.slice(-4);
    }
}