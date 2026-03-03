import { Command, Args, Flags } from '@oclif/core';
import { isAIAvailable } from '@kode/core';
import Anthropic from '@anthropic-ai/sdk';
import { render } from 'ink';
import React from 'react';
import { Spinner } from '../ui/Spinner.js';
import fs from 'fs-extra';
import path from 'path';

export default class Test extends Command {
    static description = 'AI generates a test file for a given source file';

    static examples = [
        '$ kode test src/utils.ts',
        '$ kode test src/api.ts --write',
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
    };

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Test);
        const cwd = process.cwd();
        const filePath = path.resolve(cwd, args.file);

        if (!(await fs.pathExists(filePath))) {
            this.log(`\n❌  File not found: ${args.file}\n`);
            process.exitCode = 1;
            return;
        }

        if (!isAIAvailable()) {
            this.log('\n❌  ANTHROPIC_API_KEY is not set.');
            this.log('   Run: export ANTHROPIC_API_KEY=your-key-here\n');
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

        try {
            await this.runWithSpinner(`Generating tests for ${args.file}…`, async () => {
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
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('credit balance')) {
                this.log('\n❌  Credit balance too low.');
                this.log('   Add credits at: https://console.anthropic.com\n');
            } else {
                this.log(`\n❌  Failed: ${msg.split('\n')[0]}\n`);
            }
            process.exitCode = 1;
            return;
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

    private async runWithSpinner(label: string, fn: () => Promise<void>): Promise<void> {
        const { unmount, rerender } = render(React.createElement(Spinner, { label }));
        try {
            await fn();
            rerender(React.createElement(Spinner, { label, done: true }));
        } catch (err) {
            rerender(React.createElement(Spinner, { label, failed: true }));
            unmount();
            throw err;
        }
        await new Promise((r) => setTimeout(r, 150));
        unmount();
    }

    private dim(text: string): string { return `\x1b[2m${text}\x1b[0m`; }
}