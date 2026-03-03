import type { CheckResult } from './index.js';

interface SemgrepResult {
    path: string;
    start: { line: number };
    extra: {
        severity: string;
        message: string;
    };
}

interface SemgrepReport {
    results: SemgrepResult[];
    errors: unknown[];
}

export async function runSecurityScan(cwd: string): Promise<CheckResult> {
    const start = Date.now();
    const { execa } = await import('execa');


    // Check if semgrep is installed
    try {
        await execa('semgrep', ['--version'], { cwd });
    } catch {
        return {
            name: 'Security (Semgrep)',
            passed: true,
            output: 'Semgrep not installed — skipping. Install with: pip install semgrep',
            duration: Date.now() - start,
        };
    }

    try {
        const { stdout } = await execa(
            'semgrep',
            ['--config=auto', '--json', 'src/'],
            { cwd }
        );

        const report: SemgrepReport = JSON.parse(stdout);
        const critical = report.results.filter((r) => r.extra.severity === 'ERROR');

        return {
            name: 'Security (Semgrep)',
            passed: critical.length === 0,
            output:
                critical.length === 0
                    ? `No critical issues found (${report.results.length} total findings)`
                    : critical
                        .map((r) => `${r.path}:${r.start.line} — ${r.extra.message}`)
                        .join('\n'),
            duration: Date.now() - start,
        };
    } catch (err: unknown) {
        const error = err as { stdout?: string; message?: string };

        // Semgrep exits with code 1 when findings exist — parse stdout anyway
        if (error.stdout) {
            try {
                const report: SemgrepReport = JSON.parse(error.stdout);
                const critical = report.results.filter((r) => r.extra.severity === 'ERROR');
                return {
                    name: 'Security (Semgrep)',
                    passed: critical.length === 0,
                    output: critical
                        .map((r) => `${r.path}:${r.start.line} — ${r.extra.message}`)
                        .join('\n'),
                    duration: Date.now() - start,
                };
            } catch {
                // fall through
            }
        }

        return {
            name: 'Security (Semgrep)',
            passed: false,
            output: error.message ?? String(err),
            duration: Date.now() - start,
        };
    }
}