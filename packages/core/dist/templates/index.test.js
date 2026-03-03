"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const os_1 = __importDefault(require("os"));
const index_1 = require("./index");
const TEMPLATES_ROOT = path_1.default.resolve(__dirname, '../../../../templates');
// Helper: create a temp dir, clean it up after each test
let tmpDirs = [];
async function makeTmpDir() {
    const dir = await fs_extra_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'kode-test-'));
    tmpDirs.push(dir);
    return dir;
}
(0, vitest_1.afterEach)(async () => {
    for (const dir of tmpDirs)
        await fs_extra_1.default.remove(dir);
    tmpDirs = [];
});
// ── renderTemplate ────────────────────────────────────────────────────────────
(0, vitest_1.describe)('renderTemplate', () => {
    (0, vitest_1.it)('throws if templateDir does not exist', async () => {
        const outDir = await makeTmpDir();
        await (0, vitest_1.expect)((0, index_1.renderTemplate)('/nonexistent/template', outDir, { projectName: 'test' })).rejects.toThrow('Template directory not found');
    });
    (0, vitest_1.it)('creates the output directory if it does not exist', async () => {
        const outDir = path_1.default.join(await makeTmpDir(), 'new-project');
        const templateDir = path_1.default.resolve(__dirname, '__fixtures__/simple-template');
        await (0, index_1.renderTemplate)(templateDir, outDir, { projectName: 'my-app' });
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(outDir)).toBe(true);
    });
    (0, vitest_1.it)('renders EJS variables in file contents', async () => {
        const outDir = await makeTmpDir();
        const templateDir = path_1.default.resolve(__dirname, '__fixtures__/simple-template');
        await (0, index_1.renderTemplate)(templateDir, outDir, { projectName: 'my-app' });
        const pkg = await fs_extra_1.default.readJson(path_1.default.join(outDir, 'package.json'));
        (0, vitest_1.expect)(pkg.name).toBe('my-app');
    });
    (0, vitest_1.it)('substitutes __var__ placeholders in filenames', async () => {
        const outDir = await makeTmpDir();
        const templateDir = path_1.default.resolve(__dirname, '__fixtures__/filename-template');
        await (0, index_1.renderTemplate)(templateDir, outDir, { projectName: 'cool-app' });
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(path_1.default.join(outDir, 'cool-app.config.ts'))).toBe(true);
    });
    (0, vitest_1.it)('returns a list of all files written', async () => {
        const outDir = await makeTmpDir();
        const templateDir = path_1.default.resolve(__dirname, '__fixtures__/simple-template');
        const { filesWritten } = await (0, index_1.renderTemplate)(templateDir, outDir, {
            projectName: 'my-app',
        });
        (0, vitest_1.expect)(filesWritten.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(filesWritten.every((f) => f.startsWith(outDir))).toBe(true);
    });
    (0, vitest_1.it)('recursively renders nested directories', async () => {
        const outDir = await makeTmpDir();
        const templateDir = path_1.default.resolve(__dirname, '__fixtures__/simple-template');
        await (0, index_1.renderTemplate)(templateDir, outDir, { projectName: 'nested-app' });
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(path_1.default.join(outDir, 'src', 'index.ts'))).toBe(true);
    });
});
// ── node-express template ─────────────────────────────────────────────────────
(0, vitest_1.describe)('node-express template', () => {
    (0, vitest_1.it)('renders all expected files', async () => {
        const outDir = await makeTmpDir();
        const templateDir = path_1.default.join(TEMPLATES_ROOT, 'node-express');
        await (0, index_1.renderTemplate)(templateDir, outDir, { projectName: 'my-api' });
        const expectedFiles = [
            'package.json',
            'tsconfig.json',
            '.eslintrc.json',
            '.prettierrc',
            '.gitignore',
            'src/index.ts',
        ];
        for (const file of expectedFiles) {
            (0, vitest_1.expect)(await fs_extra_1.default.pathExists(path_1.default.join(outDir, file)), `Expected file to exist: ${file}`).toBe(true);
        }
    });
    (0, vitest_1.it)('injects projectName into package.json', async () => {
        const outDir = await makeTmpDir();
        const templateDir = path_1.default.join(TEMPLATES_ROOT, 'node-express');
        await (0, index_1.renderTemplate)(templateDir, outDir, { projectName: 'my-api' });
        const pkg = await fs_extra_1.default.readJson(path_1.default.join(outDir, 'package.json'));
        (0, vitest_1.expect)(pkg.name).toBe('my-api');
    });
});
// ── react-app template ────────────────────────────────────────────────────────
(0, vitest_1.describe)('react-app template', () => {
    (0, vitest_1.it)('renders all expected files', async () => {
        const outDir = await makeTmpDir();
        const templateDir = path_1.default.join(TEMPLATES_ROOT, 'react-app');
        await (0, index_1.renderTemplate)(templateDir, outDir, { projectName: 'my-ui' });
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
            (0, vitest_1.expect)(await fs_extra_1.default.pathExists(path_1.default.join(outDir, file)), `Expected file to exist: ${file}`).toBe(true);
        }
    });
    (0, vitest_1.it)('injects projectName into package.json', async () => {
        const outDir = await makeTmpDir();
        const templateDir = path_1.default.join(TEMPLATES_ROOT, 'react-app');
        await (0, index_1.renderTemplate)(templateDir, outDir, { projectName: 'my-ui' });
        const pkg = await fs_extra_1.default.readJson(path_1.default.join(outDir, 'package.json'));
        (0, vitest_1.expect)(pkg.name).toBe('my-ui');
    });
});
// ── getAvailableTemplates ─────────────────────────────────────────────────────
(0, vitest_1.describe)('getAvailableTemplates', () => {
    (0, vitest_1.it)('returns available template names', () => {
        const templates = (0, index_1.getAvailableTemplates)(TEMPLATES_ROOT);
        (0, vitest_1.expect)(templates).toContain('node-express');
        (0, vitest_1.expect)(templates).toContain('react-app');
    });
    (0, vitest_1.it)('returns empty array for nonexistent directory', () => {
        const templates = (0, index_1.getAvailableTemplates)('/nonexistent');
        (0, vitest_1.expect)(templates).toEqual([]);
    });
});
//# sourceMappingURL=index.test.js.map