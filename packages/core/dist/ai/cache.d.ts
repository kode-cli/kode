declare class LRUCache {
    private cache;
    get(key: string): string | null;
    set(key: string, value: string): void;
    clear(): void;
}
export declare const aiCache: LRUCache;
export declare function getCacheKey(prompt: string, model: string): string;
export {};
//# sourceMappingURL=cache.d.ts.map