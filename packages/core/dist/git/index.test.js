"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("./index.js");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const simple_git_1 = require("simple-git");
(0, vitest_1.describe)('GitClient', () => {
    let tmpDir;
    let git;
    (0, vitest_1.beforeAll)(async () => {
        // Create a temp git repo for testing
        tmpDir = await fs_extra_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'kode-git-test-'));
        const rawGit = (0, simple_git_1.simpleGit)(tmpDir);
        await rawGit.init();
        await rawGit.addConfig('user.email', 'test@kode.dev');
        await rawGit.addConfig('user.name', 'Kode Test');
        // Create an initial commit so the repo is valid
        await fs_extra_1.default.writeFile(path_1.default.join(tmpDir, 'README.md'), '# Test Repo');
        await rawGit.add('.');
        await rawGit.commit('chore: initial commit');
        git = new index_js_1.GitClient(tmpDir);
    });
    (0, vitest_1.afterAll)(async () => {
        await fs_extra_1.default.remove(tmpDir);
    });
    (0, vitest_1.it)('isRepo() returns true inside a git repo', async () => {
        (0, vitest_1.expect)(await git.isRepo()).toBe(true);
    });
    (0, vitest_1.it)('isRepo() returns false outside a git repo', async () => {
        const outsideGit = new index_js_1.GitClient(os_1.default.tmpdir());
        // os.tmpdir() itself is unlikely to be a git repo
        // We create a truly non-git dir to be safe
        const nonGitDir = await fs_extra_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'kode-non-git-'));
        const nonGit = new index_js_1.GitClient(nonGitDir);
        const result = await nonGit.isRepo();
        await fs_extra_1.default.remove(nonGitDir);
        (0, vitest_1.expect)(result).toBe(false);
    });
    (0, vitest_1.it)('getCurrentBranch() returns a branch name', async () => {
        const branch = await git.getCurrentBranch();
        (0, vitest_1.expect)(typeof branch).toBe('string');
        (0, vitest_1.expect)(branch.trim().length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('getCommitHistory() returns commits', async () => {
        const commits = await git.getCommitHistory(5);
        (0, vitest_1.expect)(Array.isArray(commits)).toBe(true);
        (0, vitest_1.expect)(commits.length).toBeGreaterThan(0);
        // Each entry should be "hash message" format
        (0, vitest_1.expect)(commits[0]).toMatch(/^[0-9a-f]{7} .+/);
    });
    (0, vitest_1.it)('getStagedDiff() returns empty string when nothing is staged', async () => {
        const diff = await git.getStagedDiff();
        (0, vitest_1.expect)(diff).toBe('');
    });
    (0, vitest_1.it)('getStagedDiff() returns diff when a file is staged', async () => {
        const testFile = path_1.default.join(tmpDir, 'test.ts');
        await fs_extra_1.default.writeFile(testFile, 'const x = 1;');
        const rawGit = (0, simple_git_1.simpleGit)(tmpDir);
        await rawGit.add('test.ts');
        const diff = await git.getStagedDiff();
        (0, vitest_1.expect)(diff).toContain('test.ts');
        (0, vitest_1.expect)(diff).toContain('const x = 1');
        // Clean up — unstage the file
        await rawGit.reset(['HEAD', 'test.ts']);
        await fs_extra_1.default.remove(testFile);
    });
    (0, vitest_1.it)('commit() creates a new commit', async () => {
        const testFile = path_1.default.join(tmpDir, 'commit-test.ts');
        await fs_extra_1.default.writeFile(testFile, 'export const y = 2;');
        const rawGit = (0, simple_git_1.simpleGit)(tmpDir);
        await rawGit.add('commit-test.ts');
        await git.commit('test: add commit-test file');
        const log = await rawGit.log({ maxCount: 1 });
        (0, vitest_1.expect)(log.latest?.message).toBe('test: add commit-test file');
    });
});
(0, vitest_1.describe)('validateBranchName', () => {
    const pattern = /^(feature|fix|chore|docs|refactor|test)\/[a-z0-9-]+$/;
    (0, vitest_1.it)('accepts valid branch names', () => {
        (0, vitest_1.expect)((0, index_js_1.validateBranchName)('feature/add-login', pattern)).toBe(true);
        (0, vitest_1.expect)((0, index_js_1.validateBranchName)('fix/null-pointer', pattern)).toBe(true);
        (0, vitest_1.expect)((0, index_js_1.validateBranchName)('chore/update-deps', pattern)).toBe(true);
        (0, vitest_1.expect)((0, index_js_1.validateBranchName)('docs/readme', pattern)).toBe(true);
        (0, vitest_1.expect)((0, index_js_1.validateBranchName)('refactor/auth-module', pattern)).toBe(true);
        (0, vitest_1.expect)((0, index_js_1.validateBranchName)('test/add-coverage', pattern)).toBe(true);
    });
    (0, vitest_1.it)('rejects invalid branch names', () => {
        (0, vitest_1.expect)((0, index_js_1.validateBranchName)('bad_branch_name', pattern)).toBe(false);
        (0, vitest_1.expect)((0, index_js_1.validateBranchName)('AddNewFeature', pattern)).toBe(false);
        (0, vitest_1.expect)((0, index_js_1.validateBranchName)('feature/', pattern)).toBe(false);
        (0, vitest_1.expect)((0, index_js_1.validateBranchName)('main', pattern)).toBe(false);
        (0, vitest_1.expect)((0, index_js_1.validateBranchName)('feature/Add_Login', pattern)).toBe(false);
    });
});
//# sourceMappingURL=index.test.js.map