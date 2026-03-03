"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
async function withRetry(fn, options = {}) {
    const { retries = 3, minTimeout = 500, factor = 2, onFailedAttempt, } = options;
    let lastError = new Error('Unknown error');
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt > retries)
                break;
            // Don't retry on non-retryable errors
            if (isNonRetryable(lastError))
                break;
            onFailedAttempt?.(lastError, attempt);
            const delay = minTimeout * Math.pow(factor, attempt - 1);
            await sleep(delay);
        }
    }
    throw lastError;
}
function isNonRetryable(error) {
    const message = error.message.toLowerCase();
    return (message.includes('credit balance is too low') ||
        message.includes('invalid api key') ||
        message.includes('permission denied') ||
        message.includes('400') ||
        message.includes('401') ||
        message.includes('403'));
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=retry.js.map