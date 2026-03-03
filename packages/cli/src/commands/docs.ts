import { Command, Args, Flags } from '@oclif/core';
import { isAIAvailable } from '@kode/core';
import Anthropic from '@anthropic-ai/sdk';
import { render } from 'ink';
import React from 'react';
import { Spinner } from '../ui/Spinner.js';
import fs from 'fs-extra';
import path from 'path';

export default class Docs extends Command {
    static description = 'AI generates JSDoc/TSDoc comments for a file';

    static examples = [
        '$ kode docs src/utils.ts',
        '$ kode docs src/api.ts --write',
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

        if (!isAIAvailable()) {
            this.log('\n❌  ANTHROPIC_API_KEY is not set.');
            this.log('   Run: export ANTHROPIC_API_KEY=your-key-here\n');
            process.exitCode = 1;
            return;
        }

        const source = await fs.readFile(filePath, 'utf-8');
        const ext = path.extname(filePath);
        const isTS = ['.ts', '.tsx'].includes(ext);

        let documented = '';

        try {
            await this.runWithSpinner(`Generating docs for ${args.file}…`, async () => {
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
            // Backup original
            const backupPath = `${filePath}.bak`;
            await fs.copy(filePath, backupPath);
            await fs.writeFile(filePath, documented, 'utf-8');
            this.log(`\n✅ Documentation written to ${args.file}`);
            this.log(`   Original backed up to ${args.file}.bak\n`);
        } else {
            // Print to stdout
            this.log(`\n${'─'.repeat(60)}`);
            this.log(documented);
            this.log('─'.repeat(60));
            this.log(`\n💡 Run with ${this.dim('--write')} to save changes to the file.\n`);
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