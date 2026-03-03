import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GitClient, validateBranchName } from './index.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { simpleGit } from 'simple-git';

describe('GitClient', () => {
    let tmpDir: string;
    let git: GitClient;

    beforeAll(async () => {
        // Create a temp git repo for testing
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kode-git-test-'));
        const rawGit = simpleGit(tmpDir);
        await rawGit.init();
        await rawGit.addConfig('user.email', 'test@kode.dev');
        await rawGit.addConfig('user.name', 'Kode Test');

        // Create an initial commit so the repo is valid
        await fs.writeFile(path.join(tmpDir, 'README.md'), '# Test Repo');
        await rawGit.add('.');
        await rawGit.commit('chore: initial commit');

        git = new GitClient(tmpDir);
    });

    afterAll(async () => {
        await fs.remove(tmpDir);
    });

    it('isRepo() returns true inside a git repo', async () => {
        expect(await git.isRepo()).toBe(true);
    });

    it('isRepo() returns false outside a git repo', async () => {
        const _outsideGit = new GitClient(os.tmpdir());
        // os.tmpdir() itself is unlikely to be a git repo
        // We create a truly non-git dir to be safe
        const nonGitDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kode-non-git-'));
        const nonGit = new GitClient(nonGitDir);
        const result = await nonGit.isRepo();
        await fs.remove(nonGitDir);
        expect(result).toBe(false);
    });

    it('getCurrentBranch() returns a branch name', async () => {
        const branch = await git.getCurrentBranch();
        expect(typeof branch).toBe('string');
        expect(branch.trim().length).toBeGreaterThan(0);
    });

    it('getCommitHistory() returns commits', async () => {
        const commits = await git.getCommitHistory(5);
        expect(Array.isArray(commits)).toBe(true);
        expect(commits.length).toBeGreaterThan(0);
        // Each entry should be "hash message" format
        expect(commits[0]).toMatch(/^[0-9a-f]{7} .+/);
    });

    it('getStagedDiff() returns empty string when nothing is staged', async () => {
        const diff = await git.getStagedDiff();
        expect(diff).toBe('');
    });

    it('getStagedDiff() returns diff when a file is staged', async () => {
        const testFile = path.join(tmpDir, 'test.ts');
        await fs.writeFile(testFile, 'const x = 1;');
        const rawGit = simpleGit(tmpDir);
        await rawGit.add('test.ts');

        const diff = await git.getStagedDiff();
        expect(diff).toContain('test.ts');
        expect(diff).toContain('const x = 1');

        // Clean up — unstage the file
        await rawGit.reset(['HEAD', 'test.ts']);
        await fs.remove(testFile);
    });

    it('commit() creates a new commit', async () => {
        const testFile = path.join(tmpDir, 'commit-test.ts');
        await fs.writeFile(testFile, 'export const y = 2;');
        const rawGit = simpleGit(tmpDir);
        await rawGit.add('commit-test.ts');

        await git.commit('test: add commit-test file');

        const log = await rawGit.log({ maxCount: 1 });
        expect(log.latest?.message).toBe('test: add commit-test file');
    });
});

describe('validateBranchName', () => {
    const pattern = /^(feature|fix|chore|docs|refactor|test)\/[a-z0-9-]+$/;

    it('accepts valid branch names', () => {
        expect(validateBranchName('feature/add-login', pattern)).toBe(true);
        expect(validateBranchName('fix/null-pointer', pattern)).toBe(true);
        expect(validateBranchName('chore/update-deps', pattern)).toBe(true);
        expect(validateBranchName('docs/readme', pattern)).toBe(true);
        expect(validateBranchName('refactor/auth-module', pattern)).toBe(true);
        expect(validateBranchName('test/add-coverage', pattern)).toBe(true);
    });

    it('rejects invalid branch names', () => {
        expect(validateBranchName('bad_branch_name', pattern)).toBe(false);
        expect(validateBranchName('AddNewFeature', pattern)).toBe(false);
        expect(validateBranchName('feature/', pattern)).toBe(false);
        expect(validateBranchName('main', pattern)).toBe(false);
        expect(validateBranchName('feature/Add_Login', pattern)).toBe(false);
    });
});