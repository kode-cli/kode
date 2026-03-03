"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("./index.js");
const passing = {
    run: async () => ({
        name: 'Passing Check',
        passed: true,
        output: '',
        duration: 10,
    }),
};
const failing = {
    run: async () => ({
        name: 'Failing Check',
        passed: false,
        output: 'Something went wrong',
        duration: 10,
    }),
};
const neverRun = {
    run: async () => ({
        name: 'Should Not Run',
        passed: true,
        output: '',
        duration: 0,
    }),
};
(0, vitest_1.describe)('runQualityGate', () => {
    (0, vitest_1.it)('returns results for all passing checks', async () => {
        const results = await (0, index_js_1.runQualityGate)([passing, passing]);
        (0, vitest_1.expect)(results).toHaveLength(2);
        (0, vitest_1.expect)(results.every((r) => r.passed)).toBe(true);
    });
    (0, vitest_1.it)('stops on first failure', async () => {
        const results = await (0, index_js_1.runQualityGate)([passing, failing, neverRun]);
        // Should stop after the failing check — neverRun should not execute
        (0, vitest_1.expect)(results).toHaveLength(2);
        (0, vitest_1.expect)(results[0].passed).toBe(true);
        (0, vitest_1.expect)(results[1].passed).toBe(false);
        (0, vitest_1.expect)(results.find((r) => r.name === 'Should Not Run')).toBeUndefined();
    });
    (0, vitest_1.it)('returns empty array for no checks', async () => {
        const results = await (0, index_js_1.runQualityGate)([]);
        (0, vitest_1.expect)(results).toHaveLength(0);
    });
    (0, vitest_1.it)('returns correct structure for each result', async () => {
        const results = await (0, index_js_1.runQualityGate)([passing]);
        (0, vitest_1.expect)(results[0]).toHaveProperty('name');
        (0, vitest_1.expect)(results[0]).toHaveProperty('passed');
        (0, vitest_1.expect)(results[0]).toHaveProperty('output');
        (0, vitest_1.expect)(results[0]).toHaveProperty('duration');
    });
});
//# sourceMappingURL=index.test.js.map