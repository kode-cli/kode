import type { HealthCheckConfig } from './config.js';

export interface HealthCheckResult {
    passed: boolean;
    statusCode?: number;
    error?: string;
    attempts: number;
    duration: number;
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

export async function runHealthCheck(
    host: string,
    port: number,
    config: HealthCheckConfig,
    log: (msg: string) => void
): Promise<HealthCheckResult> {
    const start = Date.now();

    // If custom script is provided, run it instead
    if (config.customScript) {
        return runCustomHealthCheck(config.customScript, start, log);
    }

    // Wait for startup grace period
    if (config.startupGrace > 0) {
        log(`   Waiting ${config.startupGrace}s for app to start…`);
        await sleep(config.startupGrace * 1000);
    }

    const url = `http://${host}:${port}${config.endpoint}`;
    log(`   Health check: GET ${url}`);

    for (let attempt = 1; attempt <= config.retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), config.timeout * 1000);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (response.status === config.expectedStatus) {
                return {
                    passed: true,
                    statusCode: response.status,
                    attempts: attempt,
                    duration: Date.now() - start,
                };
            }

            log(`   Attempt ${attempt}/${config.retries}: HTTP ${response.status} (expected ${config.expectedStatus})`);
        } catch (err: unknown) {
            const error = err as { name?: string; message?: string };
            const msg = error.name === 'AbortError' ? 'timeout' : (error.message ?? String(err));
            log(`   Attempt ${attempt}/${config.retries}: ${msg}`);
        }

        if (attempt < config.retries) {
            log(`   Retrying in ${config.retryInterval}s…`);
            await sleep(config.retryInterval * 1000);
        }
    }

    return {
        passed: false,
        error: `Health check failed after ${config.retries} attempts`,
        attempts: config.retries,
        duration: Date.now() - start,
    };
}

async function runCustomHealthCheck(
    script: string,
    start: number,
    log: (msg: string) => void
): Promise<HealthCheckResult> {
    log(`   Running custom health check: ${script}`);

    try {
        const { execa } = await import('execa');
        await execa(script, { shell: true });
        return { passed: true, attempts: 1, duration: Date.now() - start };
    } catch {
        return {
            passed: false,
            error: `Custom health check script failed: ${script}`,
            attempts: 1,
            duration: Date.now() - start,
        };
    }
}