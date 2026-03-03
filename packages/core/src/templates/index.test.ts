import { describe, it, expect, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { renderTemplate, getAvailableTemplates } from './index';

const TEMPLATES_ROOT = path.resolve(__dirname, '../../../../templates');

// Helper: create a temp dir, clean it up after each test
let tmpDirs: string[] = [];
async function makeTmpDir(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kode-test-'));
    tmpDirs.push(dir);
    return dir;
}
afterEach(async () => {
    for (const dir of tmpDirs) await fs.remove(dir);
    tmpDirs = [];
});

// ── renderTemplate ────────────────────────────────────────────────────────────

describe('renderTemplate', () => {
    it('throws if templateDir does not exist', async () => {
        const outDir = await makeTmpDir();
        await expect(
            renderTemplate('/nonexistent/template', outDir, { projectName: 'test' })
        ).rejects.toThrow('Template directory not found');
    });

    it('creates the output directory if it does not exist', async () => {
        const outDir = path.join(await makeTmpDir(), 'new-project');
        const templateDir = path.resolve(__dirname, '__fixtures__/simple-template');
        await renderTemplate(templateDir, outDir, { projectName: 'my-app' });
        expect(await fs.pathExists(outDir)).toBe(true);
    });

    it('renders EJS variables in file contents', async () => {
        const outDir = await makeTmpDir();
        const templateDir = path.resolve(__dirname, '__fixtures__/simple-template');
        await renderTemplate(templateDir, outDir, { projectName: 'my-app' });

        const pkg = await fs.readJson(path.join(outDir, 'package.json'));
        expect(pkg.name).toBe('my-app');
    });

    it('substitutes __var__ placeholders in filenames', async () => {
        const outDir = await makeTmpDir();
        const templateDir = path.resolve(__dirname, '__fixtures__/filename-template');
        await renderTemplate(templateDir, outDir, { projectName: 'cool-app' });

        expect(await fs.pathExists(path.join(outDir, 'cool-app.config.ts'))).toBe(true);
    });

    it('returns a list of all files written', async () => {
        const outDir = await makeTmpDir();
        const templateDir = path.resolve(__dirname, '__fixtures__/simple-template');
        const { filesWritten } = await renderTemplate(templateDir, outDir, {
            projectName: 'my-app',
        });
        expect(filesWritten.length).toBeGreaterThan(0);
        expect(filesWritten.every((f) => f.startsWith(outDir))).toBe(true);
    });

    it('recursively renders nested directories', async () => {
        const outDir = await makeTmpDir();
        const templateDir = path.resolve(__dirname, '__fixtures__/simple-template');
        await renderTemplate(templateDir, outDir, { projectName: 'nested-app' });

        expect(await fs.pathExists(path.join(outDir, 'src', 'index.ts'))).toBe(true);
    });
});

// ── node-express template ─────────────────────────────────────────────────────

describe('node-express template', () => {
    it('renders all expected files', async () => {
        const outDir = await makeTmpDir();
        const templateDir = path.join(TEMPLATES_ROOT, 'node-express');
        await renderTemplate(templateDir, outDir, { projectName: 'my-api' });

        const expectedFiles = [
            'package.json',
            'tsconfig.json',
            '.eslintrc.json',
            '.prettierrc',
            '.gitignore',
            'src/index.ts',
        ];

        for (const file of expectedFiles) {
            expect(
                await fs.pathExists(path.join(outDir, file)),
                `Expected file to exist: ${file}`
            ).toBe(true);
        }
    });

    it('injects projectName into package.json', async () => {
        const outDir = await makeTmpDir();
        const templateDir = path.join(TEMPLATES_ROOT, 'node-express');
        await renderTemplate(templateDir, outDir, { projectName: 'my-api' });

        const pkg = await fs.readJson(path.join(outDir, 'package.json'));
        expect(pkg.name).toBe('my-api');
    });
});

// ── react-app template ────────────────────────────────────────────────────────

describe('react-app template', () => {
    it('renders all expected files', async () => {
        const outDir = await makeTmpDir();
        const templateDir = path.join(TEMPLATES_ROOT, 'react-app');
        await renderTemplate(templateDir, outDir, { projectName: 'my-ui' });

        const expectedFiles = [
            'package.json',
            'tsconfig.json',
            '.eslintrc.json',
            '.prettierrc',
            '.gitignore',
            'src/main.tsx',
            'index.html',
        ];

        for (const file of expectedFiles) {
            expect(
                await fs.pathExists(path.join(outDir, file)),
                `Expected file to exist: ${file}`
            ).toBe(true);
        }
    });

    it('injects projectName into package.json', async () => {
        const outDir = await makeTmpDir();
        const templateDir = path.join(TEMPLATES_ROOT, 'react-app');
        await renderTemplate(templateDir, outDir, { projectName: 'my-ui' });

        const pkg = await fs.readJson(path.join(outDir, 'package.json'));
        expect(pkg.name).toBe('my-ui');
    });
});

// ── getAvailableTemplates ─────────────────────────────────────────────────────

describe('getAvailableTemplates', () => {
    it('returns available template names', () => {
        const templates = getAvailableTemplates(TEMPLATES_ROOT);
        expect(templates).toContain('node-express');
        expect(templates).toContain('react-app');
    });

    it('returns empty array for nonexistent directory', () => {
        const templates = getAvailableTemplates('/nonexistent');
        expect(templates).toEqual([]);
    });
});