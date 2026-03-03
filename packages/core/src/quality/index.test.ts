import { describe, it, expect } from 'vitest';
import { runQualityGate } from './index.js';
import type { CheckResult, QualityCheck } from './index.js';

const passing: QualityCheck = {
    run: async (): Promise<CheckResult> => ({
        name: 'Passing Check',
        passed: true,
        output: '',
        duration: 10,
    }),
};

const failing: QualityCheck = {
    run: async (): Promise<CheckResult> => ({
        name: 'Failing Check',
        passed: false,
        output: 'Something went wrong',
        duration: 10,
    }),
};

const neverRun: QualityCheck = {
    run: async (): Promise<CheckResult> => ({
        name: 'Should Not Run',
        passed: true,
        output: '',
        duration: 0,
    }),
};

describe('runQualityGate', () => {
    it('returns results for all passing checks', async () => {
        const results = await runQualityGate([passing, passing]);
        expect(results).toHaveLength(2);
        expect(results.every((r) => r.passed)).toBe(true);
    });

    it('stops on first failure', async () => {
        const results = await runQualityGate([passing, failing, neverRun]);
        // Should stop after the failing check — neverRun should not execute
        expect(results).toHaveLength(2);
        expect(results[0].passed).toBe(true);
        expect(results[1].passed).toBe(false);
        expect(results.find((r) => r.name === 'Should Not Run')).toBeUndefined();
    });

    it('returns empty array for no checks', async () => {
        const results = await runQualityGate([]);
        expect(results).toHaveLength(0);
    });

    it('returns correct structure for each result', async () => {
        const results = await runQualityGate([passing]);
        expect(results[0]).toHaveProperty('name');
        expect(results[0]).toHaveProperty('passed');
        expect(results[0]).toHaveProperty('output');
        expect(results[0]).toHaveProperty('duration');
    });
});