import { simpleGit } from 'simple-git';
export class GitClient {
    constructor(cwd = process.cwd()) {
        this.git = simpleGit(cwd);
    }
    async getStagedDiff() {
        return this.git.diff(['--cached']);
    }
    async getCurrentBranch() {
        return this.git.revparse(['--abbrev-ref', 'HEAD']);
    }
    async getCommitHistory(count = 10) {
        const log = await this.git.log({ maxCount: count });
        return log.all.map((c) => `${c.hash.slice(0, 7)} ${c.message}`);
    }
    async commit(message) {
        await this.git.commit(message);
    }
    async isRepo() {
        try {
            await this.git.revparse(['--git-dir']);
            return true;
        }
        catch {
            return false;
        }
    }
}
export function validateBranchName(name, pattern) {
    return pattern.test(name);
}
//# sourceMappingURL=index.js.map