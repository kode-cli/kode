import { Command, Flags } from '@oclif/core';
import { GitClient, generateCommitMessage, isAIAvailable, runQualityGate, runLint, runTests, printReport, loadConfig, } from '@kode/core';
import { confirm, input } from '@inquirer/prompts';
import { render } from 'ink';
import React from 'react';
import { Spinner } from '../ui/Spinner.js';
class Commit extends Command {
    async run() {
        const { flags } = await this.parse(Commit);
        const cwd = process.cwd();
        const git = new GitClient(cwd);
        // ── 1. Check we're inside a git repo ────────────────────────────────
        if (!(await git.isRepo())) {
            this.log('\n❌  Not inside a Git repository. Run `git init` first.\n');
            process.exitCode = 1;
            return;
        }
        // ── 2. Stage all changes unless --no-add ────────────────────────────
        if (!flags['no-add']) {
            await this.runWithSpinner('Staging all changes…', async () => {
                const { execa } = await import('execa');
                await execa('git', ['add', '.'], { cwd });
            });
        }
        // ── 3. Get staged diff ───────────────────────────────────────────────
        const diff = await git.getStagedDiff();
        if (!diff.trim()) {
            this.log('\n❌  Nothing to commit — no changes detected.\n');
            process.exitCode = 1;
            return;
        }
        // ── 4. Run quality checks ────────────────────────────────────────────
        if (!flags['no-check']) {
            this.log('\n🔍 Running quality checks…\n');
            let config;
            try {
                config = await loadConfig(cwd);
            }
            catch {
                config = null;
            }
            const checks = [];
            if (config?.quality.lint ?? true) {
                checks.push({ run: () => runLint(cwd) });
            }
            if (config?.quality.test ?? true) {
                checks.push({ run: () => runTests(cwd) });
            }
            const results = await runQualityGate(checks);
            printReport(results);
            const allPassed = results.every((r) => r.passed);
            if (!allPassed) {
                const proceed = await confirm({
                    message: '⚠️  Quality checks failed. Commit anyway?',
                    default: false,
                });
                if (!proceed) {
                    this.log('\n🚫 Commit aborted. Fix the issues and try again.\n');
                    this.log('   Tip: Run `kode check --fix` to auto-fix lint issues.\n');
                    process.exitCode = 1;
                    return;
                }
                this.log('\n⚠️  Proceeding with commit despite failed checks.\n');
            }
            else {
                this.log('✅ All checks passed!\n');
            }
        }
        // ── 5. Check if AI is available ──────────────────────────────────────
        if (!isAIAvailable()) {
            this.log('\n⚠️  Degraded mode — AI unavailable (ANTHROPIC_API_KEY not set).');
            this.log('   Falling back to manual commit message entry.\n');
            const message = await input({
                message: 'Enter commit message:',
                validate: (v) => v.trim().length > 0 ? true : 'Message cannot be empty',
            });
            await git.commit(message);
            this.log(`\n✅ Committed: "${message}"`);
            if (flags.push) {
                await this.pushToRemote();
            }
            this.log('');
            return;
        }
        // ── 6. Generate commit message with Claude ───────────────────────────
        let message = '';
        try {
            await this.runWithSpinner('Generating commit message…', async () => {
                message = await generateCommitMessage(diff);
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.log(`\n❌  ${msg.split('\n')[0]}\n`);
            process.exitCode = 1;
            return;
        }
        // ── 7. Show suggestion and let user accept or edit ───────────────────
        this.log(`\nSuggested message:\n\n  ${message}\n`);
        const accepted = await confirm({ message: 'Use this message?' });
        if (!accepted) {
            message = await input({
                message: 'Enter commit message:',
                default: message,
                validate: (v) => v.trim().length > 0 ? true : 'Message cannot be empty',
            });
        }
        // ── 8. Commit ────────────────────────────────────────────────────────
        await git.commit(message);
        this.log(`\n✅ Committed: "${message}"`);
        // ── 9. Push if requested ─────────────────────────────────────────────
        if (flags.push) {
            await this.pushToRemote();
        }
        this.log('');
    }
    async pushToRemote() {
        try {
            await this.runWithSpinner('Pushing to remote…', async () => {
                const { execa } = await import('execa');
                await execa('git', ['push'], { cwd: process.cwd() });
            });
            this.log('🚀 Pushed to remote.\n');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.log(`\n❌  Push failed: ${msg.split('\n')[0]}`);
            this.log('   Run `git push` manually to retry.\n');
            process.exitCode = 1;
        }
    }
    async runWithSpinner(label, fn) {
        const { unmount, rerender } = render(React.createElement(Spinner, { label }));
        try {
            await fn();
            rerender(React.createElement(Spinner, { label, done: true }));
        }
        catch (err) {
            rerender(React.createElement(Spinner, { label, failed: true }));
            unmount();
            throw err;
        }
        await new Promise((r) => setTimeout(r, 150));
        unmount();
    }
}
Commit.description = 'Stage all changes, run quality checks, generate an AI commit message, and commit';
Commit.examples = [
    '$ kode commit',
    '$ kode commit --push',
    '$ kode commit -p',
    '$ kode commit --no-add',
    '$ kode commit --no-check',
];
Commit.flags = {
    push: Flags.boolean({
        char: 'p',
        description: 'Push to remote after committing',
        default: false,
    }),
    'no-add': Flags.boolean({
        description: 'Skip staging all changes (use already staged files only)',
        default: false,
    }),
    'no-check': Flags.boolean({
        description: 'Skip quality checks before committing',
        default: false,
    }),
};
export default Commit;
//# sourceMappingURL=commit.js.map