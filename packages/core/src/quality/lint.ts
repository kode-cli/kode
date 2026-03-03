import { ESLint } from 'eslint';
import type { CheckResult } from './index.js';
import fs from 'fs-extra';
import path from 'path';

export async function runLint(cwd: string, fix = false): Promise<CheckResult> {
    const start = Date.now();

    const configFiles = [
        'eslint.config.js', 'eslint.config.ts', 'eslint.config.mjs',
        '.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.ts',
    ];

    let hasConfig = false;
    for (const f of configFiles) {
        if (await fs.pathExists(path.join(cwd, f))) {
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
        const eslint = new ESLint({ cwd, fix });
        const results = await eslint.lintFiles(['src/']);

        if (fix) await ESLint.outputFixes(results);

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
    } catch (err: unknown) {
        return {
            name: 'ESLint',
            passed: false,
            output: err instanceof Error ? err.message : String(err),
            duration: Date.now() - start,
        };
    }
}