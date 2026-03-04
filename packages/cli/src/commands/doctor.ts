import { Command } from '@oclif/core';
import { readGlobalConfig } from '@kode/core';
import { simpleGit } from 'simple-git';

interface Check {
    label:  string;
    status: 'pass' | 'warn' | 'fail';
    detail: string;
    fix?:   string;
}

export default class Doctor extends Command {
    static description = 'Check that Kode is set up correctly on this machine';
    static examples    = ['$ kode doctor'];

    async run(): Promise<void> {
        this.log('\n🩺 Kode Doctor\n');

        // Run checks sequentially (not Promise.all) to avoid execa race
        const checks: Check[] = [];
        checks.push(await this.checkNode());
        checks.push(await this.checkApiKey());
        checks.push(await this.checkDocker());
        checks.push(await this.checkGit());
        checks.push(await this.checkGitIdentity());
        checks.push(await this.checkGhCli());

        let hasFailures = false;
        let hasWarnings = false;

        for (const check of checks) {
            const icon =
                check.status === 'pass' ? '✅' :
                    check.status === 'warn' ? '⚠️ ' : '❌';

            this.log(`  ${icon}  ${check.label}`);
            this.log(`      ${this.dim(check.detail)}`);

            if (check.fix && check.status !== 'pass') {
                this.log(`      ${this.dim('Fix: ' + check.fix)}`);
            }

            if (check.status === 'fail') hasFailures = true;
            if (check.status === 'warn') hasWarnings = true;
        }

        this.log('');

        if (!hasFailures && !hasWarnings) {
            this.log('  ✨ Everything looks great! Kode is ready to use.\n');
        } else if (hasFailures) {
            this.log('  ❌ Some checks failed. Fix the issues above and run `kode doctor` again.\n');
        } else {
            this.log('  ⚠️  Some optional tools are missing — core features still work.\n');
        }
    }

    // ── checks ────────────────────────────────────────────────────────────────

    private async checkNode(): Promise<Check> {
        const version = process.versions.node;
        const major   = parseInt(version.split('.')[0], 10);
        return {
            label:  `Node.js ${version}`,
            status: major >= 18 ? 'pass' : 'fail',
            detail: major >= 18
                ? 'Version meets requirement (>=18)'
                : 'Node.js 18+ is required',
            fix: major < 18 ? 'Install latest LTS from https://nodejs.org' : undefined,
        };
    }

    private async checkApiKey(): Promise<Check> {
        const fromEnv    = !!process.env.ANTHROPIC_API_KEY;
        const config     = await readGlobalConfig();
        const fromConfig = !!config.ANTHROPIC_API_KEY;

        if (fromEnv || fromConfig) {
            const source = fromConfig ? '~/.kode/config.json' : 'shell environment';
            return {
                label:  'ANTHROPIC_API_KEY',
                status: 'pass',
                detail: `Configured (loaded from ${source})`,
            };
        }

        return {
            label:  'ANTHROPIC_API_KEY',
            status: 'fail',
            detail: 'Not set — AI features (commit, pr, diff, docs, test, add) will not work',
            fix:    'kode config set ANTHROPIC_API_KEY sk-ant-...',
        };
    }

    private async checkDocker(): Promise<Check> {
        try {
            const { execa } = await import('execa');
            const { stdout } = await execa('docker', ['--version'], { timeout: 3000 });
            const version = stdout.match(/Docker version ([^\s,]+)/)?.[1] ?? 'unknown';

            try {
                await execa('docker', ['info'], { timeout: 5000, stdio: 'pipe' });
                return {
                    label:  `Docker ${version}`,
                    status: 'pass',
                    detail: 'Installed and Docker Desktop is running',
                };
            } catch {
                return {
                    label:  `Docker ${version}`,
                    status: 'warn',
                    detail: 'Installed but Docker Desktop is not running',
                    fix:    'Open the Docker Desktop application',
                };
            }
        } catch {
            return {
                label:  'Docker Desktop',
                status: 'warn',
                detail: 'Not installed — required for `kode deploy --staging`',
                fix:    'Install from https://www.docker.com/products/docker-desktop',
            };
        }
    }

    private async checkGit(): Promise<Check> {
        try {
            const { execa } = await import('execa');
            const { stdout } = await execa('git', ['--version'], { timeout: 3000 });
            const version = stdout.match(/git version (.+)/)?.[1]?.trim() ?? 'unknown';
            return {
                label:  `Git ${version}`,
                status: 'pass',
                detail: 'Installed and accessible',
            };
        } catch {
            return {
                label:  'Git',
                status: 'fail',
                detail: 'Not installed — required for all git commands',
                fix:    'Install from https://git-scm.com',
            };
        }
    }

    private async checkGitIdentity(): Promise<Check> {
        try {
            const git   = simpleGit();
            const name  = await git.raw(['config', '--global', 'user.name']).catch(() => '');
            const email = await git.raw(['config', '--global', 'user.email']).catch(() => '');

            if (name.trim() && email.trim()) {
                return {
                    label:  'Git identity',
                    status: 'pass',
                    detail: `${name.trim()} <${email.trim()}>`,
                };
            }

            return {
                label:  'Git identity',
                status: 'warn',
                detail: 'Name or email not configured globally',
                fix:    'git config --global user.name "Your Name" && git config --global user.email "you@example.com"',
            };
        } catch {
            return {
                label:  'Git identity',
                status: 'warn',
                detail: 'Could not read git global config',
            };
        }
    }

    private async checkGhCli(): Promise<Check> {
        try {
            const { execa } = await import('execa');
            const { stdout } = await execa('gh', ['--version'], { timeout: 3000 });
            const version = stdout.match(/gh version ([^\s]+)/)?.[1] ?? 'unknown';

            try {
                await execa('gh', ['auth', 'status'], { timeout: 5000, stdio: 'pipe' });
                return {
                    label:  `GitHub CLI ${version}`,
                    status: 'pass',
                    detail: 'Installed and authenticated',
                };
            } catch {
                return {
                    label:  `GitHub CLI ${version}`,
                    status: 'warn',
                    detail: 'Installed but not logged in — needed for `kode init --github`',
                    fix:    'gh auth login',
                };
            }
        } catch {
            return {
                label:  'GitHub CLI',
                status: 'warn',
                detail: 'Not installed — optional, needed for `kode init --github`',
                fix:    'brew install gh  (or visit https://cli.github.com)',
            };
        }
    }

    private dim(text: string): string {
        return `\x1b[2m${text}\x1b[0m`;
    }
}