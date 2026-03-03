import { Command, Flags } from '@oclif/core';
import { GitClient, generatePRDescription, isAIAvailable } from '@kode/core';
import { render } from 'ink';
import React from 'react';
import { Spinner } from '../ui/Spinner.js';
class PR extends Command {
    async run() {
        const { flags } = await this.parse(PR);
        const git = new GitClient();
        if (!(await git.isRepo())) {
            this.log('\n❌  Not inside a Git repository. Run `git init` first.\n');
            process.exitCode = 1;
            return;
        }
        if (!isAIAvailable()) {
            this.log('\n❌  ANTHROPIC_API_KEY is not set.');
            this.log('   Run: export ANTHROPIC_API_KEY=your-key-here');
            this.log('   Get a key at: https://console.anthropic.com\n');
            process.exitCode = 1;
            return;
        }
        const commits = await git.getCommitHistory(flags.commits);
        if (commits.length === 0) {
            this.log('\n❌  No commits found in this repository.\n');
            process.exitCode = 1;
            return;
        }
        this.log(`\nGenerating PR description from ${commits.length} commit(s)…`);
        let description = '';
        try {
            await this.runWithSpinner('Generating PR description…', async () => {
                description = await generatePRDescription(commits);
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.log(`\n❌  ${msg.split('\n')[0]}\n`);
            process.exitCode = 1;
            return;
        }
        this.log('\n' + '─'.repeat(60));
        this.log(description);
        this.log('─'.repeat(60) + '\n');
        this.log('💡 Tip: Copy the above into your PR description on GitHub.\n');
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
PR.description = 'Generate an AI pull request description from recent commits';
PR.examples = [
    '$ kode pr',
    '$ kode pr --commits 20',
];
PR.flags = {
    commits: Flags.integer({
        char: 'n',
        description: 'Number of recent commits to include',
        default: 10,
    }),
};
export default PR;
//# sourceMappingURL=pr.js.map