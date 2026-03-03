import { Command, Flags } from '@oclif/core';
import { GitClient, isAIAvailable } from '@kode/core';
import { simpleGit } from 'simple-git';
import Anthropic from '@anthropic-ai/sdk';
import { render } from 'ink';
import React from 'react';
import { Spinner } from '../ui/Spinner.js';

export default class Diff extends Command {
    static description = 'Show an AI explanation of your current changes';

    static examples = [
        '$ kode diff',
        '$ kode diff --staged',
        '$ kode diff --no-ai',
    ];

    static flags = {
        staged: Flags.boolean({
            char: 's',
            description: 'Show only staged changes',
            default: false,
        }),
        'no-ai': Flags.boolean({
            description: 'Show raw diff without AI explanation',
            default: false,
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Diff);
        const cwd = process.cwd();
        const git = new GitClient(cwd);

        if (!(await git.isRepo())) {
            this.log('\n❌  Not inside a Git repository.\n');
            process.exitCode = 1;
            return;
        }

        const rawGit = simpleGit(cwd);

        // Get diff
        const diff = flags.staged
            ? await rawGit.diff(['--cached'])
            : await rawGit.diff();

        const stagedDiff = await rawGit.diff(['--cached']);

        if (!diff.trim() && !stagedDiff.trim()) {
            this.log('\n📭 No changes detected.\n');
            return;
        }

        const fullDiff = diff + (stagedDiff && diff ? '\n' + stagedDiff : stagedDiff);

        // ── Show stats ────────────────────────────────────────────────────────
        const statArgs = flags.staged ? ['--cached', '--stat'] : ['--stat'];
        const stats = await rawGit.diff(statArgs);

        if (stats.trim()) {
            this.log('\n📊 Changed files:\n');
            stats.split('\n').forEach((line) => this.log(`  ${line}`));
        }

        // ── AI explanation ────────────────────────────────────────────────────
        if (flags['no-ai']) {
            this.log('\n💡 Tip: Run `kode commit` to commit these changes.\n');
            return;
        }

        if (!isAIAvailable()) {
            this.log(`\n${this.dim('ℹ️  Set ANTHROPIC_API_KEY to enable AI explanation.')}\n`);
            this.log('💡 Tip: Run `kode commit` to commit these changes.\n');
            return;
        }

        let explanation = '';

        try {
            await this.runWithSpinner('Analyzing changes…', async () => {
                const client = new Anthropic();
                const response = await client.messages.create({
                    model: 'claude-sonnet-4-6',
                    max_tokens: 512,
                    system: `You explain code changes in plain English for a developer.
Describe WHAT changed and WHY it likely matters in 3-5 sentences.
Be specific about the actual code changes. No bullet points. No markdown.`,
                    messages: [{
                        role: 'user',
                        content: `Explain these changes:\n\n${fullDiff.slice(0, 8000)}`,
                    }],
                });

                const content = response.content[0];
                if (content.type === 'text') {
                    explanation = content.text.trim();
                }
            });

            this.log('\n🤖 What changed:\n');
            this.log(`  ${explanation}\n`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('credit balance')) {
                this.log(`\n${this.dim('ℹ️  AI summary unavailable — credit balance too low.')}`);
                this.log(`${this.dim('   Add credits at: https://console.anthropic.com')}\n`);
            } else {
                this.log(`\n❌  AI analysis failed: ${msg.split('\n')[0]}\n`);
            }
        }

        this.log('💡 Tip: Run `kode commit` to commit these changes.\n');
    }

    private async runWithSpinner(label: string, fn: () => Promise<void>): Promise<void> {
        const { unmount, rerender } = render(
            React.createElement(Spinner, { label })
        );
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

    private dim(text: string): string {
        return `\x1b[2m${text}\x1b[0m`;
    }
}