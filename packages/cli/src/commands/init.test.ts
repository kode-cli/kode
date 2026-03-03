import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { execa } from 'execa';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

// Path to compiled CLI bin
const KODE_BIN = path.resolve(__dirname, '../../bin/run.js');

describe('kode init', () => {
    const tmpBase = os.tmpdir();
    const projectName = 'kode-test-project';
    const projectDir = path.join(tmpBase, projectName);

    afterEach(async () => {
        await fs.remove(projectDir);
    });

    it('creates a project directory from node-express template', async () => {
        await execa('node', [KODE_BIN, 'init', projectName, '--template', 'node-express', '--no-git', '--no-install'], {
            cwd: tmpBase,
            env: { ...process.env, CI: 'true' },
        });

        expect(await fs.pathExists(projectDir)).toBe(true);
    });

    it('renders package.json with the correct project name', async () => {
        await execa('node', [KODE_BIN, 'init', projectName, '--template', 'node-express', '--no-git', '--no-install'], {
            cwd: tmpBase,
            env: { ...process.env, CI: 'true' },
        });

        const pkg = await fs.readJson(path.join(projectDir, 'package.json'));
        expect(pkg.name).toBe(projectName);
    });

    it('generates kode.config.ts referencing the correct template', async () => {
        await execa('node', [KODE_BIN, 'init', projectName, '--template', 'node-express', '--no-git', '--no-install'], {
            cwd: tmpBase,
            env: { ...process.env, CI: 'true' },
        });

        const configPath = path.join(projectDir, 'kode.config.ts');
        expect(await fs.pathExists(configPath)).toBe(true);

        const configContent = await fs.readFile(configPath, 'utf-8');
        expect(configContent).toContain(`name: '${projectName}'`);
        expect(configContent).toContain(`template: 'node-express'`);
    });

    it('initializes a git repository with an initial commit', async () => {
        await execa('node', [KODE_BIN, 'init', projectName, '--template', 'node-express', '--no-install'], {
            cwd: tmpBase,
            env: { ...process.env, CI: 'true' },
        });

        // .git directory should exist
        expect(await fs.pathExists(path.join(projectDir, '.git'))).toBe(true);

        // initial commit should be present
        const { stdout } = await execa('git', ['log', '--oneline'], { cwd: projectDir });
        expect(stdout).toContain('chore: initial commit');
    });

    it('skips git init when --no-git is passed', async () => {
        await execa('node', [KODE_BIN, 'init', projectName, '--template', 'node-express', '--no-git', '--no-install'], {
            cwd: tmpBase,
            env: { ...process.env, CI: 'true' },
        });

        expect(await fs.pathExists(path.join(projectDir, '.git'))).toBe(false);
    });

    it('creates the correct source entry point', async () => {
        await execa('node', [KODE_BIN, 'init', projectName, '--template', 'node-express', '--no-git', '--no-install'], {
            cwd: tmpBase,
            env: { ...process.env, CI: 'true' },
        });

        expect(await fs.pathExists(path.join(projectDir, 'src', 'index.ts'))).toBe(true);
    });

    it('substitutes projectName inside source files', async () => {
        await execa('node', [KODE_BIN, 'init', projectName, '--template', 'node-express', '--no-git', '--no-install'], {
            cwd: tmpBase,
            env: { ...process.env, CI: 'true' },
        });

        const src = await fs.readFile(path.join(projectDir, 'src', 'index.ts'), 'utf-8');
        expect(src).toContain(projectName);
        expect(src).not.toContain('<%= projectName %>');
    });

    it('works with react-app template', async () => {
        await execa('node', [KODE_BIN, 'init', projectName, '--template', 'react-app', '--no-git', '--no-install'], {
            cwd: tmpBase,
            env: { ...process.env, CI: 'true' },
        });

        expect(await fs.pathExists(path.join(projectDir, 'src', 'App.tsx'))).toBe(true);
        const pkg = await fs.readJson(path.join(projectDir, 'package.json'));
        expect(pkg.name).toBe(projectName);
    });
});