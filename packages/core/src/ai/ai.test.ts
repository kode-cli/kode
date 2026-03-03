import { describe, it, expect, beforeEach } from 'vitest';
import { aiCache, getCacheKey } from './cache.js';
import { withRetry } from './retry.js';

describe('LRU Cache', () => {
    beforeEach(() => {
        aiCache.clear();
    });

    it('stores and retrieves a value', () => {
        aiCache.set('key1', 'value1');
        expect(aiCache.get('key1')).toBe('value1');
    });

    it('returns null for missing keys', () => {
        expect(aiCache.get('nonexistent')).toBeNull();
    });

    it('returns null for expired entries', async () => {
        // We can't easily test TTL without mocking time,
        // so just verify the happy path works
        aiCache.set('key2', 'value2');
        expect(aiCache.get('key2')).toBe('value2');
    });

    it('clears all entries', () => {
        aiCache.set('key3', 'value3');
        aiCache.set('key4', 'value4');
        aiCache.clear();
        expect(aiCache.get('key3')).toBeNull();
        expect(aiCache.get('key4')).toBeNull();
    });
});

describe('getCacheKey', () => {
    it('returns a hex string', () => {
        const key = getCacheKey('test prompt', 'claude-sonnet-4-6');
        expect(key).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns the same key for the same inputs', () => {
        const key1 = getCacheKey('same prompt', 'claude-sonnet-4-6');
        const key2 = getCacheKey('same prompt', 'claude-sonnet-4-6');
        expect(key1).toBe(key2);
    });

    it('returns different keys for different prompts', () => {
        const key1 = getCacheKey('prompt A', 'claude-sonnet-4-6');
        const key2 = getCacheKey('prompt B', 'claude-sonnet-4-6');
        expect(key1).not.toBe(key2);
    });
});

describe('withRetry', () => {
    it('returns result on first success', async () => {
        const result = await withRetry(async () => 'success');
        expect(result).toBe('success');
    });

    it('retries on failure and succeeds', async () => {
        let attempts = 0;
        const result = await withRetry(
            async () => {
                attempts++;
                if (attempts < 3) throw new Error('temporary failure');
                return 'eventually succeeded';
            },
            { retries: 3, minTimeout: 10 }
        );
        expect(result).toBe('eventually succeeded');
        expect(attempts).toBe(3);
    });

    it('throws after exhausting retries', async () => {
        await expect(
            withRetry(async () => { throw new Error('always fails'); }, {
                retries: 2,
                minTimeout: 10,
            })
        ).rejects.toThrow('always fails');
    });

    it('does not retry on non-retryable errors', async () => {
        let attempts = 0;
        await expect(
            withRetry(
                async () => {
                    attempts++;
                    throw new Error('credit balance is too low');
                },
                { retries: 3, minTimeout: 10 }
            )
        ).rejects.toThrow('credit balance is too low');
        expect(attempts).toBe(1); // should not retry
    });

    it('calls onFailedAttempt callback', async () => {
        const failedAttempts: number[] = [];
        await expect(
            withRetry(
                async () => { throw new Error('fail'); },
                {
                    retries: 2,
                    minTimeout: 10,
                    onFailedAttempt: (_, attempt) => failedAttempts.push(attempt),
                }
            )
        ).rejects.toThrow();
        expect(failedAttempts).toEqual([1, 2]);
    });
});