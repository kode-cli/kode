import { Command, Args, Flags } from '@oclif/core';
import { isAIAvailable } from '@kode-tools/core';
import Anthropic from '@anthropic-ai/sdk';
import { input } from '@inquirer/prompts';
import { runWithSpinner } from '../utils/spinner.js';
import { toErrorMessage } from '../utils/errors.js';
import fs from 'fs-extra';
import path from 'path';

export default class Add extends Command {
    static description = 'AI generates a new feature or component and adds it to your project';

    static examples = [
        '$ kode add auth',
        '$ kode add "user profile page"',
        '$ kode add middleware --dir src/middleware',
    ];

    static args = {
        feature: Args.string({
            required: false,
            description: 'Feature or component to add',
        }),
    };

    static flags = {
        dir: Flags.string({
            char: 'd',
            description: 'Directory to write the generated file(s)',
            default: 'src',
        }),
    };

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Add);
        const cwd = process.cwd();

        if (!isAIAvailable()) {
            this.log('\n❌  ANTHROPIC_API_KEY is not set.');
            this.log('   Run: export ANTHROPIC_API_KEY=your-key-here\n');
            process.exitCode = 1;
            return;
        }

        const feature =
            args.feature ??
            (await input({
                message: 'What would you like to add?',
                validate: (v) => v.trim().length > 0 ? true : 'Please describe the feature',
            }));

        // Detect project type from package.json
        const pkgPath = path.join(cwd, 'package.json');
        let projectContext = '';
        if (await fs.pathExists(pkgPath)) {
            const pkg = await fs.readJson(pkgPath);
            const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
            if (deps.includes('react')) projectContext = 'React TypeScript project';
            else if (deps.includes('express')) projectContext = 'Node.js Express TypeScript API';
            else if (deps.includes('next')) projectContext = 'Next.js TypeScript project';
            else projectContext = 'TypeScript project';
        }

        // Read existing src files for context
        const srcDir = path.join(cwd, flags.dir);
        let existingFiles = '';
        if (await fs.pathExists(srcDir)) {
            const files = await fs.readdir(srcDir);
            existingFiles = files.slice(0, 20).join(', ');
        }

        let generatedCode = '';
        let suggestedFilename = '';

        try {
            await runWithSpinner(`Generating ${feature}…`, async () => {
                const client = new Anthropic();

                // First, get filename suggestion
                const nameResponse = await client.messages.create({
                    model: 'claude-sonnet-4-6',
                    max_tokens: 50,
                    system: 'Return ONLY a filename with extension (e.g. auth.ts, UserCard.tsx). No explanation.',
                    messages: [{
                        role: 'user',
                        content: `What filename should I use for: "${feature}" in a ${projectContext}?`,
                    }],
                });

                const nameContent = nameResponse.content[0];
                suggestedFilename = nameContent.type === 'text'
                    ? nameContent.text.trim().replace(/['"]/g, '')
                    : `${feature.replace(/\s+/g, '-')}.ts`;

                // Then generate the code
                const codeResponse = await client.messages.create({
                    model: 'claude-sonnet-4-6',
                    max_tokens: 4096,
                    system: `You are an expert ${projectContext} developer.
Generate production-ready code for the requested feature.
Rules:
- Write clean, well-typed TypeScript code
- Include all necessary imports
- Export the main functionality
- Add brief inline comments for complex logic
- Return ONLY the code, no explanation, no markdown fences
${existingFiles ? `Existing files in project: ${existingFiles}` : ''}`,
                    messages: [{
                        role: 'user',
                        content: `Generate a ${feature} for my ${projectContext}. Filename will be: ${suggestedFilename}`,
                    }],
                });

                const codeContent = codeResponse.content[0];
                if (codeContent.type === 'text') generatedCode = codeContent.text.trim();
            });
        } catch (err) {
            const msg = toErrorMessage(err);
            if (msg.includes('credit balance')) {
                this.log('\n❌  Credit balance too low.');
                this.log('   Add credits at: https://console.anthropic.com\n');
            } else {
                this.log(`\n❌  Failed: ${msg.split('\n')[0]}\n`);
            }
            process.exitCode = 1;
            return;
        }

        // Write to file
        const outputDir = path.join(cwd, flags.dir);
        const outputPath = path.join(outputDir, suggestedFilename);

        await fs.ensureDir(outputDir);
        await fs.writeFile(outputPath, generatedCode, 'utf-8');

        this.log(`\n✅ Created: ${flags.dir}/${suggestedFilename}\n`);
        this.log(`   Preview:\n`);

        // Show first 20 lines as preview
        const preview = generatedCode.split('\n').slice(0, 20).join('\n');
        preview.split('\n').forEach((line) => this.log(`   ${this.dim(line)}`));
        if (generatedCode.split('\n').length > 20) {
            this.log(`   ${this.dim('...')}`);
        }

        this.log(`\n💡 Review the file and run ${this.dim('kode commit')} when ready.\n`);
    }


    private dim(text: string): string { return `\x1b[2m${text}\x1b[0m`; }
}