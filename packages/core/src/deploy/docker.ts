import type { DeployConfig } from './config.js';
import { simpleGit } from 'simple-git';

export interface BuildResult {
    imageTag: string;
    version: string;
    gitSha: string;
}

export async function buildImage(
    config: DeployConfig,
    environment: 'staging' | 'production',
    log: (msg: string) => void,
    cwd: string
): Promise<BuildResult> {
    const { execa } = await import('execa');

    // Resolve version
    const version = await resolveVersion(config, cwd);

    // Resolve git SHA
    const gitSha = await resolveGitSha(cwd);

    // Build image tag
    const imageName = config.project.registry
        ? `${config.project.registry}/${config.project.name}`
        : config.project.name;

    const imageTag = `${imageName}:${environment === 'staging' ? 'staging' : version}-${gitSha}`;

    log(`\n   Building Docker image: ${imageTag}`);
    log(`   Dockerfile: ${config.project.dockerfile}`);
    log(`   Context: ${config.project.buildContext}`);

    const buildArgs: string[] = [];

    // Add --build-arg flags
    if (config.project.buildArgs) {
        for (const [key, value] of Object.entries(config.project.buildArgs)) {
            buildArgs.push('--build-arg', `${key}=${value}`);
        }
    }

    const args = [
        'build',
        '-t', imageTag,
        '-f', config.project.dockerfile,
        ...buildArgs,
        config.project.buildContext,
    ];

    try {
        const { stdout } = await execa('docker', args, { cwd, all: true });
        if (stdout?.trim()) {
            log(`   ${stdout.trim().split('\n').slice(-3).join('\n   ')}`);
        }
    } catch (err: unknown) {
        const error = err as { all?: string; message?: string };
        throw new Error(`Docker build failed:\n${error.all ?? error.message ?? String(err)}`);
    }

    log(`   ✅ Image built: ${imageTag}`);
    return { imageTag, version, gitSha };
}

export async function pushImage(
    imageTag: string,
    log: (msg: string) => void,
    cwd: string
): Promise<void> {
    const { execa } = await import('execa');

    log(`\n   Pushing image to registry: ${imageTag}`);

    try {
        await execa('docker', ['push', imageTag], { cwd });
        log(`   ✅ Image pushed`);
    } catch (err: unknown) {
        const error = err as { message?: string };
        throw new Error(`Docker push failed:\n${error.message ?? String(err)}`);
    }
}

export async function resolveVersion(config: DeployConfig, cwd: string): Promise<string> {
    if (config.project.version) return config.project.version;

    try {
        const fs = await import('fs-extra');
        const path = await import('path');
        const pkgPath = path.join(cwd, 'package.json');
        if (await fs.pathExists(pkgPath)) {
            const pkg = await fs.readJson(pkgPath);
            return pkg.version ?? '1.0.0';
        }
    } catch { /* ignore */ }

    return '1.0.0';
}

async function resolveGitSha(cwd: string): Promise<string> {
    try {
        const git = simpleGit(cwd);
        const sha = await git.revparse(['--short', 'HEAD']);
        return sha.trim();
    } catch {
        return 'nogit';
    }
}

export async function checkDockerRunning(): Promise<boolean> {
    try {
        const { execa } = await import('execa');
        await execa('docker', ['info'], { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}