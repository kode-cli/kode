export type CheckResult = {
    name: string;
    passed: boolean;
    output: string;
    duration: number;
};

export interface QualityCheck {
    run(): Promise<CheckResult>;
}

export async function runQualityGate(checks: QualityCheck[]): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    for (const check of checks) {
        const result = await check.run();
        results.push(result);
        if (!result.passed) break; // stop on first failure
    }
    return results;
}

export { runLint } from './lint.js';
export { runTests } from './test.js';
export { runSecurityScan } from './security.js';
export { printReport } from './reporter.js';