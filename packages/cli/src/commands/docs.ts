import { Command, Args, Flags } from '@oclif/core';
import { isAIAvailable } from '@kode-tools/core';
import Anthropic from '@anthropic-ai/sdk';
import { runWithSpinner } from '../utils/spinner.js';
import { toErrorMessage } from '../utils/errors.js';
import fs from 'fs-extra';
import path from 'path';

export default class Docs extends Command {
    static description = 'Generate JSDoc/TSDoc comments for a file (manual stubs by default, AI-enhanced with --ai)';

    static examples = [
        '$ kode docs src/utils.ts',
        '$ kode docs src/api.ts --write',
        '$ kode docs src/api.ts --ai',
        '$ kode docs src/api.ts --ai --write',
    ];

    static args = {
        file: Args.string({
            required: true,
            description: 'File to document',
        }),
    };

    static flags = {
        write: Flags.boolean({
            char: 'w',
            description: 'Write the documented version back to the file',
            default: false,
        }),
        ai: Flags.boolean({
            description: 'Use AI (Claude) to generate rich documentation (requires ANTHROPIC_API_KEY)',
            default: false,
        }),
    };

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Docs);
        const cwd = process.cwd();
        const filePath = path.resolve(cwd, args.file);

        if (!(await fs.pathExists(filePath))) {
            this.log(`\n❌  File not found: ${args.file}\n`);
            process.exitCode = 1;
            return;
        }

        const source = await fs.readFile(filePath, 'utf-8');
        const ext = path.extname(filePath);
        const isTS = ['.ts', '.tsx'].includes(ext);

        let documented = '';

        // ── AI mode ───────────────────────────────────────────────────────────
        if (flags.ai) {
            if (!isAIAvailable()) {
                this.log('\n❌  --ai requires ANTHROPIC_API_KEY to be set.');
                this.log('   Run: export ANTHROPIC_API_KEY=your-key-here');
                this.log('   Get a key at: https://console.anthropic.com\n');
                this.log('   💡 Tip: Run without --ai for manual doc stubs.\n');
                process.exitCode = 1;
                return;
            }

            try {
                await runWithSpinner(`Generating AI docs for ${args.file}…`, async () => {
                    const client = new Anthropic();
                    const response = await client.messages.create({
                        model: 'claude-sonnet-4-6',
                        max_tokens: 4096,
                        system: `You add ${isTS ? 'TSDoc' : 'JSDoc'} comments to code.
Rules:
- Add /** */ comments to all exported functions, classes, interfaces, and types
- Document all parameters with @param, return values with @returns
- Add @example where helpful
- Keep existing comments, only add missing ones
- Return ONLY the fully documented source code, no explanation
- Do not wrap in markdown code fences`,
                        messages: [{
                            role: 'user',
                            content: `Add documentation comments to this file:\n\n${source}`,
                        }],
                    });

                    const content = response.content[0];
                    if (content.type === 'text') documented = content.text.trim();
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
            // ── Manual stub mode (default) ────────────────────────────────────
            this.log(`\n📝 Generating doc stubs for ${args.file}…`);
            documented = this.generateManualStubs(source, isTS);
            this.log(`   ${this.dim('Tip: Use --ai for AI-generated rich documentation.')}`);
        }

        if (flags.write) {
            const backupPath = `${filePath}.bak`;
            await fs.copy(filePath, backupPath);
            await fs.writeFile(filePath, documented, 'utf-8');
            this.log(`\n✅ Documentation written to ${args.file}`);
            this.log(`   Original backed up to ${args.file}.bak\n`);
        } else {
            this.log(`\n${'─'.repeat(60)}`);
            this.log(documented);
            this.log('─'.repeat(60));
            this.log(`\n💡 Run with ${this.dim('--write')} to save changes to the file.\n`);
        }
    }

    /**
     * Generates minimal JSDoc/TSDoc placeholder stubs for exported
     * functions, classes, and interfaces without requiring AI.
     */
    private generateManualStubs(source: string, isTS: boolean): string {
        const lines = source.split('\n');
        const output: string[] = [];
        const docTag = isTS ? 'TSDoc' : 'JSDoc';

        // Patterns to detect exported declarations that may lack a doc comment
        const exportPattern = /^export\s+(async\s+)?(function|class|interface|type|const|let|var|enum)\s+(\w+)/;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trimStart();
            const match = exportPattern.exec(trimmed);

            if (match) {
                // Check if the previous non-empty line already has a doc comment
                const prevLine = output[output.length - 1]?.trim() ?? '';
                const alreadyHasDoc = prevLine === '*/' || prevLine.startsWith('/**');

                if (!alreadyHasDoc) {
                    const indent = line.match(/^(\s*)/)?.[1] ?? '';
                    const kind = match[2];   // function | class | interface | …
                    const name = match[3];

                    const stub = this.buildStub(indent, kind, name, lines, i, docTag);
                    output.push(...stub);
                }
            }

            output.push(line);
        }

        return output.join('\n');
    }

    private buildStub(
        indent: string,
        kind: string,
        name: string,
        lines: string[],
        lineIdx: number,
        _docTag: string,
    ): string[] {
        const stub: string[] = [];
        stub.push(`${indent}/**`);
        stub.push(`${indent} * TODO: Document ${kind} \`${name}\`.`);

        // Try to extract parameter names from the function signature
        if (kind === 'function' || kind === 'const') {
            const sig = lines.slice(lineIdx, lineIdx + 5).join(' ');
            const paramMatch = sig.match(/\(([^)]*)\)/);
            if (paramMatch && paramMatch[1].trim()) {
                const rawParams = paramMatch[1].split(',');
                for (const p of rawParams) {
                    const paramName = p.trim().split(/[:\s=]/)[0].replace(/^\.\.\./, '');
                    if (paramName && /^\w+$/.test(paramName)) {
                        stub.push(`${indent} * @param ${paramName} - `);
                    }
                }
                stub.push(`${indent} * @returns `);
            }
        }

        stub.push(`${indent} */`);
        return stub;
    }

    private dim(text: string): string { return `\x1b[2m${text}\x1b[0m`; }
}