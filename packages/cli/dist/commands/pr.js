import { Command, Flags } from '@oclif/core';
import { GitClient, generatePRDescription, isAIAvailable } from '@kode/core';
import { runWithSpinner } from '../utils/spinner.js';
import { toErrorMessage } from '../utils/errors.js';
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
            await runWithSpinner('Generating PR description…', async () => {
                description = await generatePRDescription(commits);
            });
        }
        catch (err) {
            const msg = toErrorMessage(err);
            this.log(`\n❌  ${msg.split('\n')[0]}\n`);
            process.exitCode = 1;
            return;
        }
        this.log('\n' + '─'.repeat(60));
        this.log(description);
        this.log('─'.repeat(60) + '\n');
        this.log('💡 Tip: Copy the above into your PR description on GitHub.\n');
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