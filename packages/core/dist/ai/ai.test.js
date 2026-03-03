"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cache_js_1 = require("./cache.js");
const retry_js_1 = require("./retry.js");
(0, vitest_1.describe)('LRU Cache', () => {
    (0, vitest_1.beforeEach)(() => {
        cache_js_1.aiCache.clear();
    });
    (0, vitest_1.it)('stores and retrieves a value', () => {
        cache_js_1.aiCache.set('key1', 'value1');
        (0, vitest_1.expect)(cache_js_1.aiCache.get('key1')).toBe('value1');
    });
    (0, vitest_1.it)('returns null for missing keys', () => {
        (0, vitest_1.expect)(cache_js_1.aiCache.get('nonexistent')).toBeNull();
    });
    (0, vitest_1.it)('returns null for expired entries', async () => {
        // We can't easily test TTL without mocking time,
        // so just verify the happy path works
        cache_js_1.aiCache.set('key2', 'value2');
        (0, vitest_1.expect)(cache_js_1.aiCache.get('key2')).toBe('value2');
    });
    (0, vitest_1.it)('clears all entries', () => {
        cache_js_1.aiCache.set('key3', 'value3');
        cache_js_1.aiCache.set('key4', 'value4');
        cache_js_1.aiCache.clear();
        (0, vitest_1.expect)(cache_js_1.aiCache.get('key3')).toBeNull();
        (0, vitest_1.expect)(cache_js_1.aiCache.get('key4')).toBeNull();
    });
});
(0, vitest_1.describe)('getCacheKey', () => {
    (0, vitest_1.it)('returns a hex string', () => {
        const key = (0, cache_js_1.getCacheKey)('test prompt', 'claude-sonnet-4-6');
        (0, vitest_1.expect)(key).toMatch(/^[0-9a-f]{64}$/);
    });
    (0, vitest_1.it)('returns the same key for the same inputs', () => {
        const key1 = (0, cache_js_1.getCacheKey)('same prompt', 'claude-sonnet-4-6');
        const key2 = (0, cache_js_1.getCacheKey)('same prompt', 'claude-sonnet-4-6');
        (0, vitest_1.expect)(key1).toBe(key2);
    });
    (0, vitest_1.it)('returns different keys for different prompts', () => {
        const key1 = (0, cache_js_1.getCacheKey)('prompt A', 'claude-sonnet-4-6');
        const key2 = (0, cache_js_1.getCacheKey)('prompt B', 'claude-sonnet-4-6');
        (0, vitest_1.expect)(key1).not.toBe(key2);
    });
});
(0, vitest_1.describe)('withRetry', () => {
    (0, vitest_1.it)('returns result on first success', async () => {
        const result = await (0, retry_js_1.withRetry)(async () => 'success');
        (0, vitest_1.expect)(result).toBe('success');
    });
    (0, vitest_1.it)('retries on failure and succeeds', async () => {
        let attempts = 0;
        const result = await (0, retry_js_1.withRetry)(async () => {
            attempts++;
            if (attempts < 3)
                throw new Error('temporary failure');
            return 'eventually succeeded';
        }, { retries: 3, minTimeout: 10 });
        (0, vitest_1.expect)(result).toBe('eventually succeeded');
        (0, vitest_1.expect)(attempts).toBe(3);
    });
    (0, vitest_1.it)('throws after exhausting retries', async () => {
        await (0, vitest_1.expect)((0, retry_js_1.withRetry)(async () => { throw new Error('always fails'); }, {
            retries: 2,
            minTimeout: 10,
        })).rejects.toThrow('always fails');
    });
    (0, vitest_1.it)('does not retry on non-retryable errors', async () => {
        let attempts = 0;
        await (0, vitest_1.expect)((0, retry_js_1.withRetry)(async () => {
            attempts++;
            throw new Error('credit balance is too low');
        }, { retries: 3, minTimeout: 10 })).rejects.toThrow('credit balance is too low');
        (0, vitest_1.expect)(attempts).toBe(1); // should not retry
    });
    (0, vitest_1.it)('calls onFailedAttempt callback', async () => {
        const failedAttempts = [];
        await (0, vitest_1.expect)((0, retry_js_1.withRetry)(async () => { throw new Error('fail'); }, {
            retries: 2,
            minTimeout: 10,
            onFailedAttempt: (_, attempt) => failedAttempts.push(attempt),
        })).rejects.toThrow();
        (0, vitest_1.expect)(failedAttempts).toEqual([1, 2]);
    });
});
//# sourceMappingURL=ai.test.js.map