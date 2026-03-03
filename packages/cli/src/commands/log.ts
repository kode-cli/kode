import { Command, Flags } from '@oclif/core';
import { GitClient, isAIAvailable } from '@kode/core';
import { simpleGit } from 'simple-git';
import Anthropic from '@anthropic-ai/sdk';

export default class Log extends Command {
    static description = 'Show a beautiful AI-summarized git history';

    static examples = [
        '$ kode log',
        '$ kode log --count 20',
        '$ kode log --no-ai',
    ];

    static flags = {
        count: Flags.integer({
            char: 'n',
            description: 'Number of commits to show',
            default: 10,
        }),
        'no-ai': Flags.boolean({
            description: 'Skip AI summary, show raw commit log only',
            default: false,
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Log);
        const cwd = process.cwd();
        const git = new GitClient(cwd);

        if (!(await git.isRepo())) {
            this.log('\n❌  Not inside a Git repository.\n');
            process.exitCode = 1;
            return;
        }

        const rawGit = simpleGit(cwd);
        const log = await rawGit.log({ maxCount: flags.count });

        if (log.all.length === 0) {
            this.log('\n📭 No commits yet.\n');
            return;
        }

        // ── Print formatted commit log ────────────────────────────────────────
        this.log('\n' + '─'.repeat(60));
        this.log(`  📜 Last ${log.all.length} commits`);
        this.log('─'.repeat(60));

        for (const commit of log.all) {
            const date = new Date(commit.date).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
            });
            const hash = commit.hash.slice(0, 7);
            const type = this.getCommitIcon(commit.message);

            this.log(`\n  ${type} ${commit.message}`);
            this.log(`     ${this.dim(hash)} · ${this.dim(commit.author_name)} · ${this.dim(date)}`);
        }

        this.log('\n' + '─'.repeat(60));

        // ── AI summary ────────────────────────────────────────────────────────
        if (!flags['no-ai'] && isAIAvailable()) {
            this.log('\n🤖 AI Summary…\n');

            try {
                const client = new Anthropic();
                const commitList = log.all
                    .map((c) => `${c.hash.slice(0, 7)} ${c.message}`)
                    .join('\n');

                const response = await client.messages.create({
                    model: 'claude-sonnet-4-6',
                    max_tokens: 300,
                    system: `You summarize git commit history in 2-3 sentences.
Describe what the developer has been working on recently in plain English.
Be concise, specific, and mention key features or fixes. No bullet points.`,
                    messages: [{
                        role: 'user',
                        content: `Summarize what this developer has been working on:\n\n${commitList}`,
                    }],
                });

                const content = response.content[0];
                if (content.type === 'text') {
                    this.log(`  ${content.text.trim()}`);
                }
            } catch {
                // Silently skip AI summary on error
            }

            this.log('');
        } else if (!flags['no-ai'] && !isAIAvailable()) {
            this.log(`\n  ${this.dim('(Set ANTHROPIC_API_KEY to enable AI summary)')}\n`);
        } else {
            this.log('');
        }
    }

    private getCommitIcon(message: string): string {
        const msg = message.toLowerCase();
        if (msg.startsWith('feat')) return '✨';
        if (msg.startsWith('fix')) return '🐛';
        if (msg.startsWith('docs')) return '📝';
        if (msg.startsWith('test')) return '🧪';
        if (msg.startsWith('chore')) return '🔧';
        if (msg.startsWith('refactor')) return '♻️';
        if (msg.startsWith('style')) return '💅';
        if (msg.startsWith('perf')) return '⚡';
        return '📌';
    }

    private dim(text: string): string {
        return `\x1b[2m${text}\x1b[0m`;
    }
}