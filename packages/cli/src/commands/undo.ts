import { Command, Flags } from '@oclif/core';
import { GitClient } from '@kode/core';
import { confirm } from '@inquirer/prompts';
import { simpleGit } from 'simple-git';

export default class Undo extends Command {
    static description = 'Safely revert the last commit (keeps your changes staged)';

    static examples = [
        '$ kode undo',
        '$ kode undo --hard',
    ];

    static flags = {
        hard: Flags.boolean({
            description: 'Discard changes entirely (cannot be undone)',
            default: false,
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Undo);
        const cwd = process.cwd();
        const git = new GitClient(cwd);

        if (!(await git.isRepo())) {
            this.log('\n❌  Not inside a Git repository.\n');
            process.exitCode = 1;
            return;
        }

        // Get last commit info to show the user
        const history = await git.getCommitHistory(1);
        if (history.length === 0) {
            this.log('\n❌  No commits to undo.\n');
            process.exitCode = 1;
            return;
        }

        const lastCommit = history[0];

        if (flags.hard) {
            this.log(`\n⚠️  HARD reset — this will permanently discard all changes.`);
            this.log(`   Commit to undo: ${lastCommit}\n`);

            const confirmed = await confirm({
                message: 'This cannot be undone. Are you sure?',
                default: false,
            });

            if (!confirmed) {
                this.log('\n🚫 Aborted.\n');
                return;
            }

            const rawGit = simpleGit(cwd);
            await rawGit.reset(['--hard', 'HEAD~1']);
            this.log(`\n✅ Hard reset complete. Commit "${lastCommit}" has been discarded.\n`);
        } else {
            this.log(`\n   Commit to undo: ${lastCommit}`);
            this.log('   Your changes will be kept and re-staged.\n');

            const confirmed = await confirm({
                message: 'Undo this commit?',
                default: true,
            });

            if (!confirmed) {
                this.log('\n🚫 Aborted.\n');
                return;
            }

            const rawGit = simpleGit(cwd);
            await rawGit.reset(['--soft', 'HEAD~1']);
            this.log(`\n✅ Commit undone. Your changes are still staged — ready to re-commit.\n`);
            this.log('   Tip: Run `kode commit` to create a new commit.\n');
        }
    }
}