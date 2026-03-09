import { ESLint } from 'eslint';
import fs from 'fs-extra';
import path from 'path';
/** Common source directories / root-level globs to lint, in priority order. */
const CANDIDATE_SOURCES = ['src', 'lib', 'app'];
/**
 * Resolves the list of source paths to pass to ESLint.
 * Only includes directories that actually exist under `cwd`.
 * Falls back to root-level `*.ts` / `*.js` files when no known dir is found.
 */
async function resolveLintTargets(cwd) {
    const targets = [];
    for (const dir of CANDIDATE_SOURCES) {
        if (await fs.pathExists(path.join(cwd, dir))) {
            targets.push(`${dir}/`);
        }
    }
    if (targets.length === 0) {
        // Last-resort: lint any TS/JS files sitting at the project root
        const rootEntries = await fs.readdir(cwd);
        const rootFiles = rootEntries.filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f));
        targets.push(...rootFiles);
    }
    return targets;
}
/** Returns true when the error message is the ESLint "no matching files" error. */
function isNoFilesError(err) {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.includes('No files matching') || msg.includes('All files matched by');
}
export async function runLint(cwd, fix = false) {
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
    const targets = await resolveLintTargets(cwd);
    if (targets.length === 0) {
        return {
            name: 'ESLint',
            passed: true,
            output: 'No source files found — skipping lint.',
            duration: Date.now() - start,
        };
    }
    try {
        const eslint = new ESLint({ cwd, fix });
        const results = await eslint.lintFiles(targets);
        if (fix)
            await ESLint.outputFixes(results);
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
        // ESLint throws when none of the resolved targets match any files
        // (e.g. an empty src/ dir). Treat this as a graceful skip.
        if (isNoFilesError(err)) {
            return {
                name: 'ESLint',
                passed: true,
                output: 'No source files found — skipping lint.',
                duration: Date.now() - start,
            };
        }
        return {
            name: 'ESLint',
            passed: false,
            output: err instanceof Error ? err.message : String(err),
            duration: Date.now() - start,
        };
    }
}
//# sourceMappingURL=lint.js.map