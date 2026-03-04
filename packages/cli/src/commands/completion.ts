import { Command, Args, Flags } from '@oclif/core';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export default class Completion extends Command {
    static description = 'Install shell tab completions for Kode';

    static examples = [
        '$ kode completion install',
        '$ kode completion install --zsh',
        '$ kode completion install --bash',
        '$ kode completion install --fish',
        '$ kode completion uninstall',
    ];

    static args = {
        action: Args.string({
            required: false,
            options: ['install', 'uninstall'],
            default: 'install',
            description: 'install or uninstall completions',
        }),
    };

    static flags = {
        zsh:  Flags.boolean({ description: 'Force zsh' }),
        bash: Flags.boolean({ description: 'Force bash' }),
        fish: Flags.boolean({ description: 'Force fish' }),
    };

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Completion);

        // Auto-detect shell if no flag given
        let shell: 'zsh' | 'bash' | 'fish';
        if (flags.zsh)       shell = 'zsh';
        else if (flags.bash) shell = 'bash';
        else if (flags.fish) shell = 'fish';
        else                 shell = this.detectShell();

        if (args.action === 'uninstall') {
            await this.uninstall(shell);
        } else {
            await this.install(shell);
        }
    }

    // ── Install ───────────────────────────────────────────────────────────────

    private async install(shell: 'zsh' | 'bash' | 'fish'): Promise<void> {
        this.log(`\n⚙️  Installing Kode completions for ${shell}…\n`);

        switch (shell) {
            case 'zsh':  await this.installZsh(); break;
            case 'bash': await this.installBash(); break;
            case 'fish': await this.installFish(); break;
        }
    }

    private async installZsh(): Promise<void> {
        const rcFile = path.join(os.homedir(), '.zshrc');
        const marker = '# kode-completion-zsh';
        const block  = `\n${marker}\neval "$(kode autocomplete:script zsh)"\n`;

        const existing = await fs.readFile(rcFile, 'utf-8').catch(() => '');
        if (existing.includes(marker)) {
            this.log('✅ Zsh completions are already installed.\n');
            return;
        }

        await fs.appendFile(rcFile, block);
        this.log(`✅ Added to ${rcFile}`);
        this.log('\n   Reload your shell to activate:\n');
        this.log('   source ~/.zshrc\n');
        this.log('   Then press Tab after `kode ` to see all commands.\n');
    }

    private async installBash(): Promise<void> {
        const rcFile = path.join(os.homedir(), '.bashrc');
        const marker = '# kode-completion-bash';
        const block  = `\n${marker}\neval "$(kode autocomplete:script bash)"\n`;

        const existing = await fs.readFile(rcFile, 'utf-8').catch(() => '');
        if (existing.includes(marker)) {
            this.log('✅ Bash completions are already installed.\n');
            return;
        }

        await fs.appendFile(rcFile, block);
        this.log(`✅ Added to ${rcFile}`);
        this.log('\n   Reload your shell to activate:\n');
        this.log('   source ~/.bashrc\n');
    }

    private async installFish(): Promise<void> {
        const fishDir  = path.join(os.homedir(), '.config', 'fish', 'completions');
        const fishFile = path.join(fishDir, 'kode.fish');

        await fs.ensureDir(fishDir);
        await fs.writeFile(fishFile, '# kode-completion-fish\nkode autocomplete:script fish | source\n');

        this.log(`✅ Written to ${fishFile}`);
        this.log('\n   Restart your terminal to activate fish completions.\n');
    }

    // ── Uninstall ─────────────────────────────────────────────────────────────

    private async uninstall(shell: 'zsh' | 'bash' | 'fish'): Promise<void> {
        this.log(`\n🗑️  Removing Kode completions for ${shell}…\n`);

        if (shell === 'fish') {
            const fishFile = path.join(os.homedir(), '.config', 'fish', 'completions', 'kode.fish');
            if (await fs.pathExists(fishFile)) {
                await fs.remove(fishFile);
                this.log(`✅ Removed ${fishFile}\n`);
            } else {
                this.log('⚠️  No fish completion file found.\n');
            }
            return;
        }

        const rcFile = shell === 'zsh'
            ? path.join(os.homedir(), '.zshrc')
            : path.join(os.homedir(), '.bashrc');

        const marker  = `# kode-completion-${shell}`;
        const content = await fs.readFile(rcFile, 'utf-8').catch(() => '');

        if (!content.includes(marker)) {
            this.log(`⚠️  No Kode completion block found in ${rcFile}\n`);
            return;
        }

        // Remove the marker line and the eval line after it
        const cleaned = content
            .split('\n')
            .reduce<string[]>((acc, line, i, arr) => {
                if (line.trim() === marker) return acc;
                if (i > 0 && arr[i - 1]?.trim() === marker) return acc;
                acc.push(line);
                return acc;
            }, [])
            .join('\n');

        await fs.writeFile(rcFile, cleaned, 'utf-8');
        this.log(`✅ Removed from ${rcFile}`);
        this.log(`\n   Run: source ${rcFile}\n`);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private detectShell(): 'zsh' | 'bash' | 'fish' {
        const shell = process.env.SHELL ?? '';
        if (shell.includes('zsh'))  return 'zsh';
        if (shell.includes('fish')) return 'fish';
        return 'bash';
    }
}