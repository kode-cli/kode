import crypto from 'crypto';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;
class LRUCache {
    constructor() {
        this.cache = new Map();
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        // Move to end (most recently used) — only on valid, non-expired entries
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
    }
    set(key, value) {
        // Evict oldest if at capacity
        if (this.cache.size >= MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey)
                this.cache.delete(firstKey);
        }
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });
    }
    get size() {
        return this.cache.size;
    }
    clear() {
        this.cache.clear();
    }
}
export const aiCache = new LRUCache();
export function getCacheKey(prompt, model) {
    return crypto
        .createHash('sha256')
        .update(`${model}:${prompt}`)
        .digest('hex');
}
//# sourceMappingURL=cache.js.map