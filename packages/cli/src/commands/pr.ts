import { Command, Flags } from '@oclif/core';
import { GitClient, generatePRDescription, isAIAvailable } from '@kode-tools/core';
import { runWithSpinner } from '../utils/spinner.js';
import { toErrorMessage } from '../utils/errors.js';

export default class PR extends Command {
    static description = 'Generate a pull request description from recent commits (manual template by default, AI-enhanced with --ai)';

    static examples = [
        '$ kode pr',
        '$ kode pr --commits 20',
        '$ kode pr --ai',
        '$ kode pr --ai --commits 20',
    ];

    static flags = {
        commits: Flags.integer({
            char: 'n',
            description: 'Number of recent commits to include',
            default: 10,
        }),
        ai: Flags.boolean({
            description: 'Use AI (Claude) to generate the PR description (requires ANTHROPIC_API_KEY)',
            default: false,
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(PR);
        const git = new GitClient();

        if (!(await git.isRepo())) {
            this.log('\n❌  Not inside a Git repository. Run `git init` first.\n');
            process.exitCode = 1;
            return;
        }

        const commits = await git.getCommitHistory(flags.commits);

        if (commits.length === 0) {
            this.log('\n❌  No commits found in this repository.\n');
            process.exitCode = 1;
            return;
        }

        let description = '';

        // ── AI mode ───────────────────────────────────────────────────────────
        if (flags.ai) {
            if (!isAIAvailable()) {
                this.log('\n❌  --ai requires ANTHROPIC_API_KEY to be set.');
                this.log('   Run: export ANTHROPIC_API_KEY=your-key-here');
                this.log('   Get a key at: https://console.anthropic.com\n');
                this.log('   💡 Tip: Run without --ai for a manual PR template.\n');
                process.exitCode = 1;
                return;
            }

            this.log(`\nGenerating AI PR description from ${commits.length} commit(s)…`);

            try {
                await runWithSpinner('Generating PR description…', async () => {
                    description = await generatePRDescription(commits);
                });
            } catch (err) {
                const msg = toErrorMessage(err);
                this.log(`\n❌  ${msg.split('\n')[0]}\n`);
                process.exitCode = 1;
                return;
            }
        } else {
            // ── Manual template mode (default) ────────────────────────────────
            this.log(`\n📋 Building PR template from ${commits.length} commit(s)…`);
            this.log(`   ${this.dim('Tip: Use --ai for an AI-generated description.')}`);
            description = this.buildManualTemplate(commits);
        }

        this.log('\n' + '─'.repeat(60));
        this.log(description);
        this.log('─'.repeat(60) + '\n');
        this.log('💡 Tip: Copy the above into your PR description on GitHub.\n');
    }

    /**
     * Builds a structured PR description template from raw commit messages
     * without requiring AI.
     */
    private buildManualTemplate(commits: string[]): string {
        const changeLines = commits
            .map((c) => {
                // commits usually start with a short hash then message
                const clean = c.replace(/^[a-f0-9]{6,40}\s+/, '').trim();
                return `- ${clean}`;
            })
            .join('\n');

        return [
            `## Summary`,
            `<!-- TODO: Describe the overall purpose of this PR in 1-2 sentences. -->`,
            ``,
            `## Changes`,
            changeLines,
            ``,
            `## Testing`,
            `<!-- TODO: Describe how to test or verify these changes. -->`,
            `- [ ] Unit tests pass (\`npx vitest run\`)`,
            `- [ ] Manually tested locally`,
            ``,
            `## Notes`,
            `<!-- TODO: Any breaking changes, dependencies, or deployment notes. -->`,
        ].join('\n');
    }

    private dim(text: string): string { return `\x1b[2m${text}\x1b[0m`; }
}

