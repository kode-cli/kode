import { Command } from '@oclif/core';
import { GitClient } from '@kode-tools/core';
import { simpleGit } from 'simple-git';

export default class Status extends Command {
    static description = 'Beautiful overview of git status, branch, and recent commits';

    static examples = ['$ kode status'];

    async run(): Promise<void> {
        const cwd = process.cwd();
        const git = new GitClient(cwd);

        if (!(await git.isRepo())) {
            this.log('\n❌  Not inside a Git repository.\n');
            process.exitCode = 1;
            return;
        }

        const rawGit = simpleGit(cwd);
        const status = await rawGit.status();
        const branch = await git.getCurrentBranch();
        const log = await rawGit.log({ maxCount: 5 });

        this.log('');
        this.log(`  📍 Branch: ${this.bold(branch.trim())}`);

        // Remote tracking info
        if (status.tracking) {
            this.log(`  🔗 Tracking: ${this.dim(status.tracking)}`);
        }
        if (status.ahead > 0) {
            this.log(`  ⬆️  ${status.ahead} commit(s) ahead of remote`);
        }
        if (status.behind > 0) {
            this.log(`  ⬇️  ${status.behind} commit(s) behind remote`);
        }

        this.log('');

        // ── File changes ──────────────────────────────────────────────────────
        const staged = [
            ...status.staged.map((f) => ({ file: f, state: 'staged', icon: '✅' })),
            ...status.created.map((f) => ({ file: f, state: 'new', icon: '🆕' })),
            ...status.renamed.map((f) => ({ file: f.to, state: 'renamed', icon: '📝' })),
        ];

        const unstaged = [
            ...status.modified.map((f) => ({ file: f, state: 'modified', icon: '📝' })),
            ...status.deleted.map((f) => ({ file: f, state: 'deleted', icon: '🗑️' })),
        ];

        const untracked = status.not_added.map((f) => ({
            file: f, state: 'untracked', icon: '❓',
        }));

        if (staged.length > 0) {
            this.log(`  ${this.green('Staged changes')} (${staged.length}):`);
            staged.forEach((f) => this.log(`    ${f.icon}  ${f.file} ${this.dim(f.state)}`));
            this.log('');
        }

        if (unstaged.length > 0) {
            this.log(`  ${this.yellow('Unstaged changes')} (${unstaged.length}):`);
            unstaged.forEach((f) => this.log(`    ${f.icon}  ${f.file}`));
            this.log('');
        }

        if (untracked.length > 0) {
            this.log(`  ${this.dim('Untracked files')} (${untracked.length}):`);
            untracked.slice(0, 5).forEach((f) => this.log(`    ${f.icon}  ${f.file}`));
            if (untracked.length > 5) {
                this.log(`    ${this.dim(`...and ${untracked.length - 5} more`)}`);
            }
            this.log('');
        }

        if (staged.length === 0 && unstaged.length === 0 && untracked.length === 0) {
            this.log(`  ${this.green('✨ Working tree clean')}\n`);
        }

        // ── Recent commits ────────────────────────────────────────────────────
        if (log.all.length > 0) {
            this.log(`  ${this.dim('Recent commits:')}`);
            log.all.forEach((commit) => {
                const hash = this.dim(commit.hash.slice(0, 7));
                const date = new Date(commit.date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                });
                const icon = this.getCommitIcon(commit.message);
                this.log(`    ${hash}  ${icon} ${commit.message} ${this.dim(date)}`);
            });
            this.log('');
        }

        // ── Quick tips ────────────────────────────────────────────────────────
        if (unstaged.length > 0 || untracked.length > 0) {
            this.log(`  💡 Run ${this.dim('kode commit')} to stage and commit all changes.`);
        }
        if (status.behind > 0) {
            this.log(`  💡 Run ${this.dim('kode sync')} to pull and push latest changes.`);
        }
        this.log('');
    }

    private getCommitIcon(message: string): string {
        const msg = message.toLowerCase();
        if (msg.startsWith('feat')) return '✨';
        if (msg.startsWith('fix')) return '🐛';
        if (msg.startsWith('docs')) return '📝';
        if (msg.startsWith('test')) return '🧪';
        if (msg.startsWith('chore')) return '🔧';
        if (msg.startsWith('refactor')) return '♻️';
        return '📌';
    }

    private bold(text: string): string { return `\x1b[1m${text}\x1b[0m`; }
    private dim(text: string): string { return `\x1b[2m${text}\x1b[0m`; }
    private green(text: string): string { return `\x1b[32m${text}\x1b[0m`; }
    private yellow(text: string): string { return `\x1b[33m${text}\x1b[0m`; }
}