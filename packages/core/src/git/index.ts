import { simpleGit, SimpleGit } from 'simple-git';

export class GitClient {
    private git: SimpleGit;

    constructor(cwd: string = process.cwd()) {
        this.git = simpleGit(cwd);
    }

    async getStagedDiff(): Promise<string> {
        return this.git.diff(['--cached']);
    }

    async getCurrentBranch(): Promise<string> {
        return this.git.revparse(['--abbrev-ref', 'HEAD']);
    }

    async getCommitHistory(count = 10): Promise<string[]> {
        const log = await this.git.log({ maxCount: count });
        return log.all.map((c) => `${c.hash.slice(0, 7)} ${c.message}`);
    }

    async commit(message: string): Promise<void> {
        await this.git.commit(message);
    }

    async isRepo(): Promise<boolean> {
        try {
            await this.git.revparse(['--git-dir']);
            return true;
        } catch {
            return false;
        }
    }
}

export function validateBranchName(name: string, pattern: RegExp): boolean {
    return pattern.test(name);
}