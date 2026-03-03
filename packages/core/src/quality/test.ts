import type { CheckResult } from './index.js';

export async function runTests(cwd: string): Promise<CheckResult> {
    const start = Date.now();

    const { execa } = await import('execa');

    try {
        const result = await execa(
            'npx',
            ['vitest', 'run'],
            { cwd, all: true }
        );

        return {
            name: 'Tests',
            passed: true,
            output: result.all ?? result.stdout,
            duration: Date.now() - start,
        };
    } catch (err: unknown) {
        const error = err as {
            all?: string;
            stdout?: string;
            stderr?: string;
            message?: string;
        };

        const output = error.all ?? error.stdout ?? error.stderr ?? error.message ?? String(err);

        // No test files — treat as pass
        if (
            output.includes('No test files found') ||
            output.includes('no tests') ||
            output.includes('No tests ran')
        ) {
            return {
                name: 'Tests',
                passed: true,
                output: 'No test files found — skipping.',
                duration: Date.now() - start,
            };
        }

        return {
            name: 'Tests',
            passed: false,
            output,
            duration: Date.now() - start,
        };
    }
}