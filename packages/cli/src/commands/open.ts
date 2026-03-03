import { Command, Flags } from '@oclif/core';
import { GitClient } from '@kode/core';
import { simpleGit } from 'simple-git';
import { execa } from 'execa';

export default class Open extends Command {
    static description = 'Open the GitHub repository in your browser';

    static examples = [
        '$ kode open',
        '$ kode open --prs',
        '$ kode open --issues',
        '$ kode open --actions',
    ];

    static flags = {
        prs: Flags.boolean({
            description: 'Open pull requests page',
            default: false,
        }),
        issues: Flags.boolean({
            description: 'Open issues page',
            default: false,
        }),
        actions: Flags.boolean({
            description: 'Open GitHub Actions page',
            default: false,
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Open);
        const cwd = process.cwd();
        const git = new GitClient(cwd);

        if (!(await git.isRepo())) {
            this.log('\n❌  Not inside a Git repository.\n');
            process.exitCode = 1;
            return;
        }

        const rawGit = simpleGit(cwd);
        const remotes = await rawGit.getRemotes(true);
        const origin = remotes.find((r) => r.name === 'origin');

        if (!origin) {
            this.log('\n❌  No remote origin configured.');
            this.log('   Run: git remote add origin <url>\n');
            process.exitCode = 1;
            return;
        }

        const fetchUrl = origin.refs.fetch ?? origin.refs.push ?? '';
        let repoUrl = fetchUrl
            .trim()
            .replace(/^git@([^:]+):/, 'https://$1/')
            .replace(/\.git$/, '');

        // Append sub-page if flag provided
        if (flags.prs) repoUrl += '/pulls';
        else if (flags.issues) repoUrl += '/issues';
        else if (flags.actions) repoUrl += '/actions';

        this.log(`\n🌐 Opening: ${repoUrl}\n`);

        // Open in browser — works on macOS, Linux, Windows
        const opener =
            process.platform === 'darwin' ? 'open' :
                process.platform === 'win32' ? 'start' : 'xdg-open';

        try {
            await execa(opener, [repoUrl]);
        } catch {
            this.log(`❌  Could not open browser automatically.`);
            this.log(`   Visit manually: ${repoUrl}\n`);
        }
    }
}