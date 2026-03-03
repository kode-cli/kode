export interface RetryOptions {
    retries?: number;
    minTimeout?: number;
    factor?: number;
    onFailedAttempt?: (error: Error, attempt: number) => void;
}
export declare function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
//# sourceMappingURL=retry.d.ts.map