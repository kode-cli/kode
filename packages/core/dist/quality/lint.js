"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLint = runLint;
const eslint_1 = require("eslint");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
async function runLint(cwd, fix = false) {
    const start = Date.now();
    const configFiles = [
        'eslint.config.js', 'eslint.config.ts', 'eslint.config.mjs',
        '.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.ts',
    ];
    let hasConfig = false;
    for (const f of configFiles) {
        if (await fs_extra_1.default.pathExists(path_1.default.join(cwd, f))) {
            hasConfig = true;
            break;
        }
    }
    if (!hasConfig) {
        return {
            name: 'ESLint',
            passed: true,
            output: 'No ESLint config found — skipping lint.',
            duration: Date.now() - start,
        };
    }
    try {
        const eslint = new eslint_1.ESLint({ cwd, fix });
        const results = await eslint.lintFiles(['src/']);
        if (fix)
            await eslint_1.ESLint.outputFixes(results);
        const errorCount = results.reduce((sum, r) => sum + r.errorCount, 0);
        const warningCount = results.reduce((sum, r) => sum + r.warningCount, 0);
        const formatter = await eslint.loadFormatter('stylish');
        const output = String(await formatter.format(results));
        return {
            name: 'ESLint',
            passed: errorCount === 0,
            output: output || `No issues found (${warningCount} warnings)`,
            duration: Date.now() - start,
        };
    }
    catch (err) {
        return {
            name: 'ESLint',
            passed: false,
            output: err instanceof Error ? err.message : String(err),
            duration: Date.now() - start,
        };
    }
}
//# sourceMappingURL=lint.js.map