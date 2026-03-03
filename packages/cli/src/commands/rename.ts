import { Command, Args } from '@oclif/core';
import { confirm } from '@inquirer/prompts';
import fs from 'fs-extra';
import path from 'path';

export default class Rename extends Command {
    static description = 'Safely rename a function or variable across the whole project';

    static examples = [
        '$ kode rename getUserData getUser',
        '$ kode rename OldClassName NewClassName',
    ];

    static args = {
        from: Args.string({
            required: true,
            description: 'Current name to replace',
        }),
        to: Args.string({
            required: true,
            description: 'New name',
        }),
    };

    async run(): Promise<void> {
        const { args } = await this.parse(Rename);
        const cwd = process.cwd();
        const { from, to } = args;

        if (from === to) {
            this.log('\n❌  Old and new names are the same.\n');
            process.exitCode = 1;
            return;
        }

        this.log(`\n🔍 Scanning for "${from}"…\n`);

        const matches = await this.findMatches(cwd, from);

        if (matches.length === 0) {
            this.log(`❌  No occurrences of "${from}" found in src/\n`);
            return;
        }

        // Show preview
        this.log(`  Found ${matches.length} occurrence(s) in ${this.countFiles(matches)} file(s):\n`);

        for (const match of matches.slice(0, 20)) {
            const relPath = path.relative(cwd, match.file);
            this.log(`  ${this.dim(relPath)}:${match.line}`);
            this.log(`     ${this.highlight(match.content.trim(), from)}`);
        }

        if (matches.length > 20) {
            this.log(`  ${this.dim(`...and ${matches.length - 20} more`)}`);
        }

        this.log('');

        const confirmed = await confirm({
            message: `Replace all ${matches.length} occurrence(s) of "${from}" with "${to}"?`,
            default: true,
        });

        if (!confirmed) {
            this.log('\n🚫 Aborted.\n');
            return;
        }

        // Perform replacements
        const filesChanged = new Set<string>();
        const fileContents = new Map<string, string>();

        for (const match of matches) {
            if (!fileContents.has(match.file)) {
                fileContents.set(match.file, await fs.readFile(match.file, 'utf-8'));
            }
        }

        for (const [filePath, content] of fileContents) {
            // Use word boundary replacement to avoid partial matches
            const regex = new RegExp(`\\b${this.escapeRegex(from)}\\b`, 'g');
            const newContent = content.replace(regex, to);
            if (newContent !== content) {
                await fs.writeFile(filePath, newContent, 'utf-8');
                filesChanged.add(filePath);
            }
        }

        this.log(`\n✅ Renamed "${from}" → "${to}" in ${filesChanged.size} file(s).\n`);

        // Show changed files
        for (const f of filesChanged) {
            this.log(`   📝 ${path.relative(cwd, f)}`);
        }

        this.log(`\n💡 Run ${this.dim('kode commit')} to commit these changes.\n`);
    }

    private async findMatches(
        cwd: string,
        term: string
    ): Promise<{ file: string; line: number; content: string }[]> {
        const EXCLUDED = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.turbo']);
        const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
        const matches: { file: string; line: number; content: string }[] = [];

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
                } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
                    try {
                        const content = await fs.readFile(fullPath, 'utf-8');
                        const lines = content.split('\n');
                        const regex = new RegExp(`\\b${this.escapeRegex(term)}\\b`);

                        lines.forEach((line, i) => {
                            if (regex.test(line)) {
                                matches.push({ file: fullPath, line: i + 1, content: line });
                            }
                        });
                    } catch { /* skip */ }
                }
            }
        };

        // Search from src/ if it exists, otherwise from cwd
        const srcDir = path.join(cwd, 'src');
        await walk((await fs.pathExists(srcDir)) ? srcDir : cwd);
        return matches;
    }

    private countFiles(matches: { file: string }[]): number {
        return new Set(matches.map((m) => m.file)).size;
    }

    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private highlight(text: string, term: string): string {
        return text.replace(
            new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'g'),
            `\x1b[33m${term}\x1b[0m`
        );
    }

    private dim(text: string): string { return `\x1b[2m${text}\x1b[0m`; }
}