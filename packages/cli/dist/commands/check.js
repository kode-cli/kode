import { Command, Flags } from '@oclif/core';
import { loadConfig, runLint, runTests, runSecurityScan, } from '@kode/core';
import { render } from 'ink';
import React from 'react';
import { Spinner } from '../ui/Spinner.js';
class Check extends Command {
    async run() {
        const { flags } = await this.parse(Check);
        const cwd = process.cwd();
        let config;
        try {
            config = await loadConfig(cwd);
        }
        catch {
            this.log('ℹ️  No kode.config.ts found — using defaults (lint + test).\n');
            config = null;
        }
        const checks = [];
        const runLintCheck = flags.only ? flags.only === 'lint' : (config?.quality.lint ?? true);
        const runTestCheck = flags.only ? flags.only === 'test' : (config?.quality.test ?? true);
        const runSecurityCheck = flags.only
            ? flags.only === 'security'
            : (config?.quality.security ?? false);
        if (runLintCheck) {
            checks.push({ label: 'ESLint', fn: () => runLint(cwd, flags.fix) });
        }
        if (runTestCheck) {
            checks.push({ label: 'Tests', fn: () => runTests(cwd) });
        }
        if (runSecurityCheck) {
            checks.push({ label: 'Security (Semgrep)', fn: () => runSecurityScan(cwd) });
        }
        // Custom checks from config
        if (config?.quality.customChecks?.length && !flags.only) {
            for (const custom of config.quality.customChecks) {
                checks.push({
                    label: custom.name,
                    fn: async () => {
                        const { execa } = await import('execa');
                        const start = Date.now();
                        try {
                            const { stdout } = await execa(custom.command, { cwd, shell: true });
                            return { name: custom.name, passed: true, output: stdout, duration: Date.now() - start };
                        }
                        catch (err) {
                            const error = err;
                            return {
                                name: custom.name,
                                passed: false,
                                output: error.stdout ?? error.stderr ?? error.message ?? String(err),
                                duration: Date.now() - start,
                            };
                        }
                    },
                });
            }
        }
        if (checks.length === 0) {
            this.log('No checks enabled.\n');
            return;
        }
        // ── Run each check with its own live spinner ──────────────────────────
        this.log('');
        const results = [];
        let shouldStop = false;
        for (const check of checks) {
            if (shouldStop)
                break;
            let result = null;
            // Show spinner while check runs
            const { unmount, rerender } = render(React.createElement(Spinner, { label: check.label }));
            try {
                result = await check.fn();
                rerender(React.createElement(Spinner, {
                    label: `${check.label} ${this.dim(`${result.duration}ms`)}`,
                    done: result.passed,
                    failed: !result.passed,
                }));
            }
            catch (err) {
                result = {
                    name: check.label,
                    passed: false,
                    output: err instanceof Error ? err.message : String(err),
                    duration: 0,
                };
                rerender(React.createElement(Spinner, { label: check.label, failed: true }));
            }
            await new Promise((r) => setTimeout(r, 150));
            unmount();
            results.push(result);
            // Print failure details inline
            if (!result.passed && result.output) {
                this.log('');
                result.output
                    .split('\n')
                    .filter((l) => l.trim())
                    .forEach((l) => this.log(`   ${l}`));
                this.log('');
                shouldStop = true; // stop on first failure
            }
        }
        // ── Summary ───────────────────────────────────────────────────────────
        const allPassed = results.every((r) => r.passed);
        const passCount = results.filter((r) => r.passed).length;
        this.log('');
        if (allPassed) {
            this.log(`✅ All ${passCount} check${passCount !== 1 ? 's' : ''} passed.\n`);
        }
        else {
            const failCount = results.filter((r) => !r.passed).length;
            this.log(`❌ ${failCount} check${failCount !== 1 ? 's' : ''} failed.`);
            this.log(`   Run \`kode check --fix\` to auto-fix lint issues.\n`);
            process.exitCode = 1;
        }
    }
    dim(text) {
        return `\x1b[2m${text}\x1b[0m`;
    }
}
Check.description = 'Run the quality gate (lint, tests, security)';
Check.examples = [
    '$ kode check',
    '$ kode check --fix',
    '$ kode check --only lint',
];
Check.flags = {
    fix: Flags.boolean({
        description: 'Auto-fix lint issues',
        default: false,
    }),
    only: Flags.string({
        description: 'Run only a specific check',
        options: ['lint', 'test', 'security'],
    }),
};
export default Check;
//# sourceMappingURL=check.js.map