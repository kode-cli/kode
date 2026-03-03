import type { DeployConfig, ServerConfig } from './config.js';
import { runHealthCheck } from './health.js';
import type { BuildResult } from './docker.js';

export async function deployProduction(
    config: DeployConfig,
    build: BuildResult,
    log: (msg: string) => void,
    cwd: string,
    dryRun = false
): Promise<string[]> {
    const prod = config.environments.production;
    if (!prod) throw new Error('No production environment configured.');

    const deployedServers: string[] = [];

    if (dryRun) {
        log('\n   🔍 Dry run — verifying SSH connections…');
        for (const server of prod.servers) {
            await verifySSH(server, log);
            log(`   ✅ SSH connection to ${server.label ?? server.host} verified`);
        }
        log('\n   Dry run complete — no changes made.');
        return [];
    }

    if (prod.strategy === 'rolling') {
        await rollingDeploy(config, build, prod.servers, log, cwd, deployedServers);
    } else {
        await blueGreenDeploy(config, build, prod.servers, log, cwd, deployedServers);
    }

    return deployedServers;
}

// ── Rolling deploy ────────────────────────────────────────────────────────────

async function rollingDeploy(
    config: DeployConfig,
    build: BuildResult,
    servers: ServerConfig[],
    log: (msg: string) => void,
    cwd: string,
    deployedServers: string[]
): Promise<void> {
    const rolling = config.environments.production?.rolling;
    const waitBetween = (rolling?.waitBetweenServers ?? 10) * 1000;

    for (let i = 0; i < servers.length; i++) {
        const server = servers[i];
        const label = server.label ?? server.host;

        log(`\n   [${i + 1}/${servers.length}] Deploying to ${label}…`);

        await deployToServer(config, build, server, log, cwd);
        deployedServers.push(label);

        if (i < servers.length - 1 && waitBetween > 0) {
            log(`   Waiting ${rolling?.waitBetweenServers ?? 10}s before next server…`);
            await sleep(waitBetween);
        }
    }
}

// ── Blue-green deploy ─────────────────────────────────────────────────────────

async function blueGreenDeploy(
    config: DeployConfig,
    build: BuildResult,
    servers: ServerConfig[],
    log: (msg: string) => void,
    cwd: string,
    deployedServers: string[]
): Promise<void> {
    const blueGreen = config.environments.production?.blueGreen;
    const keepOldFor = (blueGreen?.keepOldFor ?? 60) * 1000;
    const appName = config.project.name;

    log('\n   Blue-green strategy: starting all new containers…');

    // Start new (green) containers on all servers simultaneously
    await Promise.all(
        servers.map((server) =>
            deployToServer(config, build, server, log, cwd, 'green')
        )
    );

    servers.forEach((s) => deployedServers.push(s.label ?? s.host));

    if (blueGreen?.cutoverMode === 'manual') {
        log('\n   ⚠️  Manual cutover mode — verify the new containers, then confirm.');
        log('   Press Enter to cut traffic to new containers, or Ctrl+C to abort…');
        await waitForEnter();
    }

    // Switch traffic (update port mappings) — remove old, expose new
    log('\n   Cutting over traffic to new containers…');

    for (const server of servers) {
        await runSSHCommand(
            server,
            `docker rename ${appName}-production ${appName}-blue 2>/dev/null || true`,
            log
        );
        await runSSHCommand(
            server,
            `docker rename ${appName}-green ${appName}-production`,
            log
        );
    }

    // Remove old containers after grace period
    if (keepOldFor > 0) {
        log(`\n   Old containers will be removed in ${blueGreen?.keepOldFor ?? 60}s…`);
        setTimeout(async () => {
            for (const server of servers) {
                await runSSHCommand(
                    server,
                    `docker stop ${appName}-blue 2>/dev/null; docker rm ${appName}-blue 2>/dev/null || true`,
                    () => {} // silent
                );
            }
        }, keepOldFor);
    }
}

// ── Per-server deploy ─────────────────────────────────────────────────────────

async function deployToServer(
    config: DeployConfig,
    build: BuildResult,
    server: ServerConfig,
    log: (msg: string) => void,
    cwd: string,
    suffix = 'production'
): Promise<void> {
    const prod = config.environments.production!;
    const appName = config.project.name;
    const containerName = `${appName}-${suffix}`;

    // ── Transfer image ────────────────────────────────────────────────────────
    // If no registry, save and load image directly via SSH
    if (!config.project.registry) {
        log(`   Transferring image to ${server.label ?? server.host}…`);
        await transferImageViaSSH(server, build.imageTag, log);
    }

    // ── Build env string ──────────────────────────────────────────────────────
    const envVars = {
        ...config.envVars?.shared,
        ...config.envVars?.production,
    };
    const envFlags = Object.entries(envVars)
        .map(([k, v]) => `-e ${k}=${v}`)
        .join(' ');

    const portFlag = `-p ${prod.port}:3000`;

    // ── Stop old container ────────────────────────────────────────────────────
    await runSSHCommand(server, `docker stop ${containerName} 2>/dev/null || true`, log);
    await runSSHCommand(server, `docker rm ${containerName} 2>/dev/null || true`, log);

    // ── Start new container ───────────────────────────────────────────────────
    const runCmd = [
        `docker run -d`,
        `--name ${containerName}`,
        portFlag,
        `--restart unless-stopped`,
        envFlags,
        prod.network ? `--network ${prod.network}` : '',
        build.imageTag,
    ].filter(Boolean).join(' ');

    await runSSHCommand(server, runCmd, log);

    // ── Health check ──────────────────────────────────────────────────────────
    if (config.healthCheck) {
        log(`   Running health check on ${server.label ?? server.host}…`);
        const result = await runHealthCheck(
            server.host,
            prod.port,
            config.healthCheck,
            log
        );

        if (!result.passed) {
            // Rollback this server
            await runSSHCommand(server, `docker stop ${containerName} 2>/dev/null || true`, log);
            await runSSHCommand(server, `docker rm ${containerName} 2>/dev/null || true`, log);
            throw new Error(
                `Health check failed on ${server.label ?? server.host}: ${result.error}`
            );
        }
    }
}

// ── SSH helpers ───────────────────────────────────────────────────────────────

async function runSSHCommand(
    server: ServerConfig,
    command: string,
    log: (msg: string) => void
): Promise<string> {
    const { execa } = await import('execa');

    const sshArgs = [
        ...(server.keyPath ? ['-i', server.keyPath] : []),
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'BatchMode=yes',
        '-p', String(server.port),
        `${server.user}@${server.host}`,
        command,
    ];

    try {
        const { stdout } = await execa('ssh', sshArgs);
        return stdout;
    } catch (err: unknown) {
        const error = err as { stderr?: string; message?: string };
        throw new Error(
            `SSH command failed on ${server.host}:\n  Command: ${command}\n  Error: ${error.stderr ?? error.message}`
        );
    }
}

async function verifySSH(server: ServerConfig, log: (msg: string) => void): Promise<void> {
    await runSSHCommand(server, 'echo ok', log);
}

async function transferImageViaSSH(
    server: ServerConfig,
    imageTag: string,
    log: (msg: string) => void
): Promise<void> {
    const { execa } = await import('execa');

    const sshTarget = `${server.user}@${server.host}`;
    const sshKeyArgs = server.keyPath ? ['-i', server.keyPath] : [];

    // Save image to tar, pipe directly to server via SSH, load it there
    log(`   docker save ${imageTag} | ssh ${sshTarget} docker load`);

    try {
        const save = execa('docker', ['save', imageTag]);
        const load = execa('ssh', [
            ...sshKeyArgs,
            '-o', 'StrictHostKeyChecking=no',
            '-p', String(server.port),
            sshTarget,
            'docker load',
        ]);

        save.stdout?.pipe(load.stdin!);
        await Promise.all([save, load]);
    } catch (err: unknown) {
        const error = err as { message?: string };
        throw new Error(`Image transfer failed: ${error.message ?? String(err)}`);
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

function waitForEnter(): Promise<void> {
    return new Promise((resolve) => {
        process.stdin.setRawMode?.(false);
        process.stdin.resume();
        process.stdin.once('data', () => {
            process.stdin.pause();
            resolve();
        });
    });
}