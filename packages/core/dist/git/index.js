"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitClient = void 0;
exports.validateBranchName = validateBranchName;
const simple_git_1 = require("simple-git");
class GitClient {
    constructor(cwd = process.cwd()) {
        this.git = (0, simple_git_1.simpleGit)(cwd);
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
exports.GitClient = GitClient;
function validateBranchName(name, pattern) {
    return pattern.test(name);
}
//# sourceMappingURL=index.js.map