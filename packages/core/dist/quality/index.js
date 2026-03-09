export async function runQualityGate(checks) {
    const results = [];
    for (const check of checks) {
        const result = await check.run();
        results.push(result);
        if (!result.passed)
            break; // stop on first failure
    }
    return results;
}
export { runLint } from './lint.js';
export { runTests } from './test.js';
export { runSecurityScan } from './security.js';
export { printReport } from './reporter.js';
//# sourceMappingURL=index.js.map