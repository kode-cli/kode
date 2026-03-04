import { Command, Args } from '@oclif/core';
import { GitClient, isAIAvailable } from '@kode-tools/core';
import { simpleGit } from 'simple-git';
import Anthropic from '@anthropic-ai/sdk';
import { runWithSpinner } from '../utils/spinner.js';
import { toErrorMessage } from '../utils/errors.js';
import fs from 'fs-extra';
import path from 'path';

export default class Blame extends Command {
    static description = 'AI explains who changed what in a file and why';

    static examples = [
        '$ kode blame src/index.ts',
        '$ kode blame src/auth.ts',
    ];

    static args = {
        file: Args.string({
            required: true,
            description: 'File to blame',
        }),
    };

    async run(): Promise<void> {
        const { args } = await this.parse(Blame);
        const cwd = process.cwd();
        const git = new GitClient(cwd);
        const filePath = path.resolve(cwd, args.file);

        if (!(await git.isRepo())) {
            this.log('\n❌  Not inside a Git repository.\n');
            process.exitCode = 1;
            return;
        }

        if (!(await fs.pathExists(filePath))) {
            this.log(`\n❌  File not found: ${args.file}\n`);
            process.exitCode = 1;
            return;
        }

        const rawGit = simpleGit(cwd);

        // Get blame data
        let blameOutput = '';
        try {
            blameOutput = await rawGit.raw(['blame', '--line-porcelain', args.file]);
        } catch {
            this.log(`\n❌  Could not get blame for ${args.file}. Is it tracked by git?\n`);
            process.exitCode = 1;
            return;
        }

        // Parse blame into structured data
        const contributors = this.parseBlame(blameOutput);

        // ── Print contributor summary ─────────────────────────────────────────
        this.log(`\n  🔍 ${this.bold(args.file)}\n`);
        this.log(`  ${this.bold('Contributors:')}`);

        const sorted = Object.entries(contributors)
            .sort((a, b) => b[1].lines - a[1].lines);

        for (const [author, data] of sorted) {
            const pct = Math.round((data.lines / data.totalLines) * 100);
            const bar = '█'.repeat(Math.min(15, Math.round(pct / 5)));
            const lastDate = new Date(data.lastCommitDate).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
            });
            this.log(`     👤 ${author.padEnd(20)} ${bar.padEnd(15)} ${pct}% (${data.lines} lines) — last: ${this.dim(lastDate)}`);
        }

        // ── Recent commits for this file ──────────────────────────────────────
        let fileLog = '';
        try {
            fileLog = await rawGit.raw(['log', '--oneline', '-10', '--', args.file]);
        } catch { /* ignore */ }

        if (fileLog.trim()) {
            this.log(`\n  ${this.bold('Recent changes:')}`);
            fileLog.trim().split('\n').forEach((line) => {
                this.log(`     ${this.dim(line.slice(0, 7))} ${line.slice(8)}`);
            });
        }

        // ── AI explanation ────────────────────────────────────────────────────
        if (!isAIAvailable()) {
            this.log(`\n  ${this.dim('(Set ANTHROPIC_API_KEY for AI insights)')}\n`);
            return;
        }

        let insight = '';
        try {
            await runWithSpinner('Generating AI insights…', async () => {
                const client = new Anthropic();
                const contribSummary = sorted
                    .map(([author, d]) => `${author}: ${d.lines} lines (${Math.round((d.lines / d.totalLines) * 100)}%)`)
                    .join('\n');

                const response = await client.messages.create({
                    model: 'claude-sonnet-4-6',
                    max_tokens: 300,
                    system: `You are a code historian. Given git blame data for a file, explain in 2-3 sentences:
- Who owns this file and what areas they focus on
- Any patterns in the contribution history
Be concise and factual. No markdown.`,
                    messages: [{
                        role: 'user',
                        content: `File: ${args.file}\n\nContributors:\n${contribSummary}\n\nRecent commits:\n${fileLog}`,
                    }],
                });

                const content = response.content[0];
                if (content.type === 'text') insight = content.text.trim();
            });

            this.log(`\n  🤖 ${insight}\n`);
        } catch (err) {
            const msg = toErrorMessage(err);
            if (msg.includes('credit balance')) {
                this.log(`\n  ${this.dim('ℹ️  AI insights unavailable — credit balance too low.')}\n`);
            } else {
                this.log(`\n  ❌  AI failed: ${msg.split('\n')[0]}\n`);
            }
        }
    }

    private parseBlame(raw: string): Record<string, {
        lines: number;
        totalLines: number;
        lastCommitDate: string;
    }> {
        const lines = raw.split('\n');
        const contributors: Record<string, { lines: number; totalLines: number; lastCommitDate: string }> = {};
        let totalLines = 0;
        let currentAuthor = '';
        let currentDate = '';

        for (const line of lines) {
            if (line.startsWith('author ')) {
                currentAuthor = line.slice(7).trim();
            } else if (line.startsWith('author-time ')) {
                const timestamp = parseInt(line.slice(12).trim(), 10);
                currentDate = new Date(timestamp * 1000).toISOString();
            } else if (line.startsWith('\t')) {
                // This is a code line
                if (currentAuthor) {
                    totalLines++;
                    if (!contributors[currentAuthor]) {
                        contributors[currentAuthor] = { lines: 0, totalLines: 0, lastCommitDate: currentDate };
                    }
                    contributors[currentAuthor].lines++;
                    if (currentDate > contributors[currentAuthor].lastCommitDate) {
                        contributors[currentAuthor].lastCommitDate = currentDate;
                    }
                }
            }
        }

        // Set total lines on all contributors
        for (const key of Object.keys(contributors)) {
            contributors[key].totalLines = totalLines;
        }

        return contributors;
    }

    private bold(text: string): string { return `\x1b[1m${text}\x1b[0m`; }
    private dim(text: string): string { return `\x1b[2m${text}\x1b[0m`; }
}

