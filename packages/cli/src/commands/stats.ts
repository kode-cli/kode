import { Command } from '@oclif/core';
import { GitClient } from '@kode/core';
import { simpleGit } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';

interface FileStats {
    totalFiles: number;
    totalLines: number;
    byExtension: Record<string, { files: number; lines: number }>;
}

export default class Stats extends Command {
    static description = 'Show project stats — files, lines of code, commits, contributors';

    static examples = ['$ kode stats'];

    async run(): Promise<void> {
        const cwd = process.cwd();
        const git = new GitClient(cwd);

        this.log('\n📊 Gathering project stats…\n');

        // ── File stats ────────────────────────────────────────────────────────
        const fileStats = await this.getFileStats(cwd);

        this.log(`  ${this.bold('Codebase')}`);
        this.log(`     Total files:  ${fileStats.totalFiles.toLocaleString()}`);
        this.log(`     Total lines:  ${fileStats.totalLines.toLocaleString()}`);
        this.log('');

        // Top extensions
        const topExts = Object.entries(fileStats.byExtension)
            .sort((a, b) => b[1].lines - a[1].lines)
            .slice(0, 5);

        if (topExts.length > 0) {
            this.log(`  ${this.bold('By language:')}`);
            for (const [ext, data] of topExts) {
                const bar = '█'.repeat(Math.min(20, Math.round((data.lines / fileStats.totalLines) * 20)));
                this.log(`     ${ext.padEnd(8)} ${bar.padEnd(20)} ${data.lines.toLocaleString()} lines (${data.files} files)`);
            }
            this.log('');
        }

        // ── Git stats ─────────────────────────────────────────────────────────
        if (await git.isRepo()) {
            const rawGit = simpleGit(cwd);

            // Total commits
            let totalCommits = 0;
            try {
                const countOutput = await rawGit.raw(['rev-list', '--count', 'HEAD']);
                totalCommits = parseInt(countOutput.trim(), 10);
            } catch { /* no commits yet */ }

            // Contributors
            let contributors: string[] = [];
            try {
                const shortlog = await rawGit.raw(['shortlog', '-sn', '--no-merges', 'HEAD']);
                contributors = shortlog
                    .trim()
                    .split('\n')
                    .filter(Boolean)
                    .map((line) => {
                        const match = line.trim().match(/^(\d+)\s+(.+)$/);
                        return match ? `${match[2]} (${match[1]} commits)` : line.trim();
                    });
            } catch { /* no commits yet */ }

            // First commit date
            let firstCommitDate = '';
            try {
                const firstCommit = await rawGit.raw(['log', '--reverse', '--format=%ci', 'HEAD']);
                const firstLine = firstCommit.trim().split('\n')[0];
                if (firstLine) {
                    firstCommitDate = new Date(firstLine).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric',
                    });
                }
            } catch { /* no commits yet */ }

            // Branch count
            let branchCount = 0;
            try {
                const branches = await rawGit.branchLocal();
                branchCount = branches.all.length;
            } catch { /* ignore */ }

            this.log(`  ${this.bold('Git history')}`);
            this.log(`     Total commits:   ${totalCommits.toLocaleString()}`);
            this.log(`     Branches:        ${branchCount}`);
            if (firstCommitDate) {
                this.log(`     Project started: ${firstCommitDate}`);
            }
            this.log('');

            if (contributors.length > 0) {
                this.log(`  ${this.bold('Top contributors:')}`);
                contributors.slice(0, 5).forEach((c) => this.log(`     👤 ${c}`));
                this.log('');
            }
        }

        // ── Package info ──────────────────────────────────────────────────────
        const pkgPath = path.join(cwd, 'package.json');
        if (await fs.pathExists(pkgPath)) {
            const pkg = await fs.readJson(pkgPath);
            const depCount = Object.keys(pkg.dependencies ?? {}).length;
            const devDepCount = Object.keys(pkg.devDependencies ?? {}).length;

            this.log(`  ${this.bold('Dependencies')}`);
            this.log(`     Production: ${depCount}`);
            this.log(`     Dev:        ${devDepCount}`);
            this.log('');
        }
    }

    private async getFileStats(cwd: string): Promise<FileStats> {
        const EXCLUDED = new Set([
            'node_modules', '.git', 'dist', 'build', 'coverage',
            '.turbo', '.idea', '.vscode', '.next', 'out',
        ]);

        const stats: FileStats = {
            totalFiles: 0,
            totalLines: 0,
            byExtension: {},
        };

        const walk = async (dir: string): Promise<void> => {
            let entries;
            try {
                entries = await fs.readdir(dir, { withFileTypes: true });
            } catch {
                return;
            }

            for (const entry of entries) {
                if (EXCLUDED.has(entry.name)) continue;
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    await walk(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase() || entry.name;
                    try {
                        const content = await fs.readFile(fullPath, 'utf-8');
                        const lines = content.split('\n').length;
                        stats.totalFiles++;
                        stats.totalLines += lines;
                        if (!stats.byExtension[ext]) {
                            stats.byExtension[ext] = { files: 0, lines: 0 };
                        }
                        stats.byExtension[ext].files++;
                        stats.byExtension[ext].lines += lines;
                    } catch { /* binary file, skip */ }
                }
            }
        };

        await walk(cwd);
        return stats;
    }

    private bold(text: string): string { return `\x1b[1m${text}\x1b[0m`; }
}