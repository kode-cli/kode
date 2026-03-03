import type { DeployConfig, StagingConfig } from './config.js';
import { resolveContainerPort } from './config.js';
import { runHealthCheck } from './health.js';
import type { BuildResult } from './docker.js';

export async function deployStaging(
    config: DeployConfig,
    build: BuildResult,
    log: (msg: string) => void,
    cwd: string,
    dryRun = false
): Promise<void> {
    const staging = config.environments.staging;
    if (!staging) throw new Error('No staging environment configured.');

    const containerName = staging.containerName ?? `${config.project.name}-staging`;

    log(`\n   Container: ${containerName}`);
    log(`   Port: ${staging.port}`);

    if (dryRun) {
        const containerPort = resolveContainerPort(config.project);
        log('\n   🔍 Dry run — no changes made.');
        log(`   Would run: docker run -d --name ${containerName} -p ${staging.port}:${containerPort} ${build.imageTag}`);
        return;
    }
    // ── Stop and remove existing container ───────────────────────────────────
    log('\n   Stopping existing container (if any)…');
    const { execa } = await import('execa');
    await execa('docker', ['stop', containerName], { reject: false });
    await execa('docker', ['rm', containerName], { reject: false });

    // ── Build run args ────────────────────────────────────────────────────────
    const runArgs = buildDockerRunArgs(config, staging, build, containerName);

    // ── Start new container ───────────────────────────────────────────────────
    log(`   Starting container: docker run ${runArgs.slice(1).join(' ').slice(0, 80)}…`);

    try {
        await execa('docker', runArgs, { cwd });
    } catch (err: unknown) {
        const error = err as { message?: string };
        throw new Error(`Failed to start container:\n${error.message ?? String(err)}`);
    }

    // ── Health check ──────────────────────────────────────────────────────────
    if (config.healthCheck) {
        log('\n   Running health check…');
        const result = await runHealthCheck('localhost', staging.port, config.healthCheck, log);

        if (!result.passed) {
            // Auto-rollback: stop the broken container
            await execa('docker', ['stop', containerName], { reject: false });
            await execa('docker', ['rm', containerName], { reject: false });
            throw new Error(`Health check failed: ${result.error}\nContainer has been stopped.`);
        }

        log(`   ✅ Health check passed (${result.attempts} attempt(s), ${result.duration}ms)`);
    }

    log(`\n   ✅ Staging deployed successfully!`);
    log(`   🌐 http://localhost:${staging.port}`);
}

function buildDockerRunArgs(
    config: DeployConfig,
    staging: StagingConfig,
    build: BuildResult,
    containerName: string
): string[] {
    const containerPort = resolveContainerPort(config.project);

    const args = [
        'run', '-d',
        '--name', containerName,
        '-p', `${staging.port}:${containerPort}`,
        '--restart', staging.restartPolicy,
    ];

    // Env file
    if (staging.envFile) {
        args.push('--env-file', staging.envFile);
    }

    // Env vars from config
    const envVars = {
        ...config.envVars?.shared,
        ...config.envVars?.staging,
    };
    for (const [key, value] of Object.entries(envVars)) {
        args.push('-e', `${key}=${value}`);
    }

    // Volumes
    for (const vol of staging.volumes) {
        args.push('-v', vol);
    }

    // Network
    if (staging.network) {
        args.push('--network', staging.network);
    }

    args.push(build.imageTag);
    return args;
}