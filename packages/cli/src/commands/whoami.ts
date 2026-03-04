import { Command } from '@oclif/core';
import { GitClient } from '@kode-tools/core';
import { simpleGit } from 'simple-git';
import { toHttpsUrl } from '../utils/git.js';

export default class Whoami extends Command {
    static description = 'Show current git user, remote URL, and branch info';

    static examples = ['$ kode whoami'];

    async run(): Promise<void> {
        const cwd = process.cwd();
        const git = new GitClient(cwd);

        if (!(await git.isRepo())) {
            this.log('\n❌  Not inside a Git repository.\n');
            process.exitCode = 1;
            return;
        }

        const rawGit = simpleGit(cwd);

        // Get git config
        const name = await rawGit.raw(['config', 'user.name']).catch(() => 'Not set');
        const email = await rawGit.raw(['config', 'user.email']).catch(() => 'Not set');
        const branch = await git.getCurrentBranch();

        // Get remote info
        const remotes = await rawGit.getRemotes(true);
        const origin = remotes.find((r) => r.name === 'origin');

        // Get repo root name
        const topLevel = await rawGit.raw(['rev-parse', '--show-toplevel']).catch(() => cwd);
        const repoName = topLevel.trim().split('/').pop() ?? 'unknown';

        this.log('');
        this.log(`  👤 ${this.bold('Git Identity')}`);
        this.log(`     Name:   ${name.trim()}`);
        this.log(`     Email:  ${email.trim()}`);
        this.log('');
        this.log(`  📁 ${this.bold('Repository')}`);
        this.log(`     Name:   ${repoName}`);
        this.log(`     Branch: ${branch.trim()}`);

        if (origin) {
            const fetchUrl = origin.refs.fetch ?? origin.refs.push ?? '';
            const repoUrl = toHttpsUrl(fetchUrl);
            this.log(`     Remote: ${fetchUrl.trim()}`);
            if (repoUrl !== fetchUrl.trim()) {
                this.log(`     URL:    ${repoUrl}`);
            }
        } else {
            this.log(`     Remote: ${this.dim('No remote configured')}`);
            this.log(`     ${this.dim('Tip: git remote add origin <url>')}`);
        }

        this.log('');
    }


    private bold(text: string): string { return `\x1b[1m${text}\x1b[0m`; }
    private dim(text: string): string { return `\x1b[2m${text}\x1b[0m`; }
}