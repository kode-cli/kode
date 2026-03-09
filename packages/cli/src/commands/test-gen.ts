import { Command, Args, Flags } from '@oclif/core';
import { isAIAvailable } from '@kode-tools/core';
import Anthropic from '@anthropic-ai/sdk';
import { runWithSpinner } from '../utils/spinner.js';
import { toErrorMessage } from '../utils/errors.js';
import fs from 'fs-extra';
import path from 'path';

export default class Test extends Command {
    static description = 'Generate a Vitest test file (manual scaffold by default, AI-enhanced with --ai)';

    static examples = [
        '$ kode test src/utils.ts',
        '$ kode test src/api.ts --write',
        '$ kode test src/api.ts --ai',
        '$ kode test src/api.ts --ai --write',
    ];

    static args = {
        file: Args.string({
            required: true,
            description: 'Source file to generate tests for',
        }),
    };

    static flags = {
        write: Flags.boolean({
            char: 'w',
            description: 'Write the test file to disk',
            default: false,
        }),
        ai: Flags.boolean({
            description: 'Use AI (Claude) to generate comprehensive tests (requires ANTHROPIC_API_KEY)',
            default: false,
        }),
    };

    async run(): Promise<void> {
        const {args, flags} = await this.parse(Test);
        const cwd = process.cwd();
        const filePath = path.resolve(cwd, args.file);

        if (!(await fs.pathExists(filePath))) {
            this.log(`\n❌  File not found: ${args.file}\n`);
            process.exitCode = 1;
            return;
        }

        const source = await fs.readFile(filePath, 'utf-8');
        const ext = path.extname(filePath);
        const baseName = path.basename(filePath, ext);
        const testFileName = `${baseName}.test${ext}`;
        const testFilePath = path.join(path.dirname(filePath), testFileName);

        // Check if test file already exists
        if (await fs.pathExists(testFilePath)) {
            this.log(`\n⚠️  Test file already exists: ${testFileName}`);
            this.log(`   Delete it first if you want to regenerate.\n`);
            process.exitCode = 1;
            return;
        }

        let testCode = '';

        // ── AI mode ───────────────────────────────────────────────────────────
        if (flags.ai) {
            if (!isAIAvailable()) {
                this.log('\n❌  --ai requires ANTHROPIC_API_KEY to be set.');
                this.log('   Run: export ANTHROPIC_API_KEY=your-key-here');
                this.log('   Get a key at: https://console.anthropic.com\n');
                this.log('   💡 Tip: Run without --ai for a manual test scaffold.\n');
                process.exitCode = 1;
                return;
            }

            try {
                await runWithSpinner(`Generating AI tests for ${args.file}…`, async () => {
                    const client = new Anthropic();
                    const response = await client.messages.create({
                        model: 'claude-sonnet-4-6',
                        max_tokens: 4096,
                        system: `You generate comprehensive Vitest test files for TypeScript/JavaScript source files.
Rules:
- Use Vitest (import { describe, it, expect, vi } from 'vitest')
- Import the module under test using the correct relative path
- Write tests for all exported functions, classes, and constants
- Include happy path tests, edge cases, and error cases
- Use descriptive test names that explain the expected behavior
- Mock external dependencies with vi.mock()
- Return ONLY the test code, no explanation, no markdown fences`,
                        messages: [{
                            role: 'user',
                            content: `Generate a comprehensive test file for this source file (${args.file}):\n\n${source}`,
                        }],
                    });

                    const content = response.content[0];
                    if (content.type === 'text') testCode = content.text.trim();
                });
            } catch (err) {
                const msg = toErrorMessage(err);
                if (msg.includes('credit balance')) {
                    this.log('\n❌  Credit balance too low.');
                    this.log('   Add credits at: https://console.anthropic.com\n');
                } else {
                    this.log(`\n❌  AI failed: ${msg.split('\n')[0]}\n`);
                }
                process.exitCode = 1;
                return;
            }
        } else {
            // ── Manual scaffold mode (default) ────────────────────────────────
            this.log(`\n🧪 Generating test scaffold for ${args.file}…`);
            testCode = this.generateManualScaffold(source, args.file, ext);
            this.log(`   ${this.dim('Tip: Use --ai for AI-generated comprehensive tests.')}`);
        }

        if (flags.write) {
            await fs.writeFile(testFilePath, testCode, 'utf-8');
            this.log(`\n✅ Test file written: ${testFileName}`);
            this.log(`\n   Run tests with: ${this.dim('npx vitest run')}\n`);
        } else {
            this.log(`\n${'─'.repeat(60)}`);
            this.log(`// ${testFileName}`);
            this.log('─'.repeat(60));
            this.log(testCode);
            this.log('─'.repeat(60));
            this.log(`\n💡 Run with ${this.dim('--write')} to save as ${testFileName}\n`);
        }
    }

    /**
     * Generates a manual Vitest test scaffold by parsing exported
     * symbol names from the source file — no AI required.
     */
    private generateManualScaffold(source: string, filePath: string, ext: string): string {
        const isTS = ['.ts', '.tsx'].includes(ext);
        const importPath = `./${path.basename(filePath, ext)}`;

        // Extract exported names
        const exports = this.extractExports(source);

        const lines: string[] = [
            `import { describe, it, expect, vi, beforeEach } from 'vitest';`,
        ];

        if (exports.length > 0) {
            lines.push(`import { ${exports.join(', ')} } from '${importPath}';`);
        } else {
            lines.push(`// TODO: import what you need from '${importPath}'`);
        }

        lines.push('');

        if (exports.length === 0) {
            lines.push(`describe('${path.basename(filePath, ext)}', () => {`);
            lines.push(`    it('should work', () => {`);
            lines.push(`        // TODO: write your test`);
            lines.push(`        expect(true).toBe(true);`);
            lines.push(`    });`);
            lines.push(`});`);
        } else {
            for (const name of exports) {
                lines.push(`describe('${name}', () => {`);
                lines.push(`    beforeEach(() => {`);
                lines.push(`        vi.clearAllMocks();`);
                lines.push(`    });`);
                lines.push('');
                lines.push(`    it('should be defined', () => {`);
                lines.push(`        expect(${name}).toBeDefined();`);
                lines.push(`    });`);
                lines.push('');
                lines.push(`    it('should handle the happy path', () => {`);
                lines.push(`        // TODO: arrange`);
                lines.push(`        // TODO: act`);
                lines.push(`        // TODO: assert`);
                if (isTS) lines.push(`        expect(true).toBe(true); // replace with real assertion`);
                lines.push(`    });`);
                lines.push('');
                lines.push(`    it('should handle edge cases', () => {`);
                lines.push(`        // TODO: test edge cases`);
                lines.push(`        expect(true).toBe(true);`);
                lines.push(`    });`);
                lines.push(`});`);
                lines.push('');
            }
        }

        return lines.join('\n');
    }

    private extractExports(source: string): string[] {
        const names: string[] = [];
        const seen = new Set<string>();
        // Match: export [async] function/class/const/let/var/enum/type/interface Name
        const pattern = /^export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|enum|type|interface)\s+(\w+)/gm;
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(source)) !== null) {
            if (!seen.has(m[1])) {
                seen.add(m[1]);
                names.push(m[1]);
            }
        }
        // Also match named re-exports: export { foo, bar }
        const reExport = /^export\s+[{]([^}]+)[}]/gm;
        while ((m = reExport.exec(source)) !== null) {
            for (const part of m[1].split(',')) {
                const name = part.trim().split(/\s+as\s+/).pop()!.trim();
                if (name && !seen.has(name)) {
                    seen.add(name);
                    names.push(name);
                }
            }
        }
        return names;
    }

    private dim(text: string): string {
        return `\x1b[2m${text}\x1b[0m`;
    }
}