import type { DeployConfig } from './config.js';
import { checkDockerRunning } from './docker.js';

export interface PreflightResult {
    passed: boolean;
    failures: string[];
}

export async function runPreflight(
    config: DeployConfig,
    environment: 'staging' | 'production',
    log: (msg: string) => void,
    cwd: string
): Promise<PreflightResult> {
    const failures: string[] = [];

    log('\n🔍 Running pre-deploy checks…\n');

    // ── 1. Docker running ─────────────────────────────────────────────────────
    const dockerOk = await checkDockerRunning();
    if (dockerOk) {
        log('   Docker Desktop running… ✅');
    } else {
        log('   Docker Desktop running… ❌');
        failures.push('Docker Desktop is not running. Open Docker Desktop and try again.');
    }

    // ── 2. Required env vars ──────────────────────────────────────────────────
    const required = config.envVars?.required ?? [];
    if (required.length > 0) {
        const missing = required.filter((k) => !process.env[k]);
        if (missing.length === 0) {
            log('   Required env vars… ✅');
        } else {
            log('   Required env vars… ❌');
            failures.push(`Missing required env vars: ${missing.join(', ')}`);
        }
    }

    // ── 3. Dockerfile exists ──────────────────────────────────────────────────
    const fs = await import('fs-extra');
    const path = await import('path');
    const dockerfilePath = path.join(cwd, config.project.dockerfile);
    const dockerfileExists = await fs.pathExists(dockerfilePath);
    if (dockerfileExists) {
        log('   Dockerfile exists… ✅');
    } else {
        log('   Dockerfile exists… ❌');
        failures.push(`Dockerfile not found at: ${config.project.dockerfile}`);
    }

    // ── 4. SSH connectivity check (production only) ───────────────────────────
    if (environment === 'production' && config.environments.production) {
        const servers = config.environments.production.servers;
        for (const server of servers) {
            const label = server.label ?? server.host;
            const sshOk = await testSSH(server);
            if (sshOk) {
                log(`   SSH to ${label}… ✅`);
            } else {
                log(`   SSH to ${label}… ❌`);
                failures.push(
                    `Cannot SSH to ${label}. Run: ssh ${server.user}@${server.host} to debug.`
                );
            }
        }
    }

    // ── 5. Run pre-build hooks ────────────────────────────────────────────────
    const preBuildHooks = config.hooks?.preBuild;
    if (preBuildHooks && preBuildHooks.length > 0) {
        log('\n   Running pre-build hooks…');
        for (const cmd of preBuildHooks) {
            const ok = await runCommand(cmd, cwd);
            if (ok) {
                log(`   $ ${cmd}… ✅`);
            } else {
                log(`   $ ${cmd}… ❌`);
                failures.push(`Pre-build hook failed: ${cmd}`);
                break; // stop on first failure
            }
        }
    }

    // ── 6. Secrets scan ───────────────────────────────────────────────────────
    const secretsOk = await scanForSecrets(cwd);
    if (secretsOk) {
        log('   Scanning for exposed secrets… ✅');
    } else {
        log('   Scanning for exposed secrets… ⚠️  (warning — potential secrets found in source files)');
        // Warning only, not a blocker
    }

    log('');

    return {
        passed: failures.length === 0,
        failures,
    };
}

async function testSSH(server: import('./config.js').ServerConfig): Promise<boolean> {
    try {
        const { execa } = await import('execa');
        const sshArgs = [
            ...(server.keyPath ? ['-i', server.keyPath] : []),
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'BatchMode=yes',
            '-o', 'ConnectTimeout=5',
            '-p', String(server.port),
            `${server.user}@${server.host}`,
            'echo ok',
        ];
        await execa('ssh', sshArgs, { timeout: 8000 });
        return true;
    } catch {
        return false;
    }
}

async function runCommand(cmd: string, cwd: string): Promise<boolean> {
    try {
        const { execa } = await import('execa');
        await execa(cmd, { cwd, shell: true, stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

async function scanForSecrets(cwd: string): Promise<boolean> {
    // Basic heuristic — look for common secret patterns in staged files
    const patterns = [
        /AKIA[0-9A-Z]{16}/,         // AWS access key
        /sk-[a-zA-Z0-9]{48}/,       // OpenAI key
        /sk-ant-api/,               // Anthropic key
        /ghp_[a-zA-Z0-9]{36}/,     // GitHub personal access token
        /password\s*=\s*["'][^"']{8,}/i,
    ];

    try {
        const { execa } = await import('execa');
        const fs = await import('fs-extra');
        const path = await import('path');
        const { stdout } = await execa('git', ['diff', '--cached', '--name-only'], { cwd });
        const files = stdout.trim().split('\n').filter(Boolean);

        for (const file of files) {
            const fullPath = path.join(cwd, file);
            if (!(await fs.pathExists(fullPath))) continue;
            const content = await fs.readFile(fullPath, 'utf-8').catch(() => '');
            for (const pattern of patterns) {
                if (pattern.test(content)) return false;
            }
        }
    } catch { /* ignore — git may not be available */ }

    return true;
}