import { Command, Flags, Args } from '@oclif/core';
import { renderTemplate } from '@kode/core';
import { select, input, confirm } from '@inquirer/prompts';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { simpleGit } from 'simple-git';
import { execa } from 'execa';
import fs from 'fs-extra';
import { render } from 'ink';
import React from 'react';
import { Spinner } from '../ui/Spinner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES = [
    { name: 'Node + Express API', value: 'node-express' },
    { name: 'React App (Vite)', value: 'react-app' },
] as const;

type Template = (typeof TEMPLATES)[number]['value'];

export default class Init extends Command {
    static description = 'Scaffold a new project from a template';

    static examples = [
        '$ kode init my-api',
        '$ kode init my-api --template node-express',
        '$ kode init my-app --template react-app --no-install',
    ];

    static args = {
        projectName: Args.string({
            required: false,
            description: 'Name of the project to create',
        }),
    };

    static flags = {
        template: Flags.string({
            char: 't',
            description: 'Template to scaffold from',
            options: TEMPLATES.map((t) => t.value),
        }),
        'no-install': Flags.boolean({
            description: 'Skip installing npm dependencies',
            default: false,
        }),
        'no-git': Flags.boolean({
            description: 'Skip initializing a Git repository',
            default: false,
        }),
        'no-github': Flags.boolean({
            description: 'Skip creating a GitHub repository',
            default: false,
        }),
    };

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Init);

        // ── 1. Gather inputs ─────────────────────────────────────────────────
        const projectName =
            args.projectName ??
            (await input({
                message: 'Project name:',
                validate: (v) => (v.trim().length > 0 ? true : 'Project name cannot be empty'),
            }));

        const template: Template =
            (flags.template as Template) ??
            (await select({
                message: 'Choose a template:',
                choices: TEMPLATES,
            }));

        const outputDir = path.resolve(process.cwd(), projectName);

        // ── 2. Check output dir ──────────────────────────────────────────────
        if (await fs.pathExists(outputDir)) {
            const overwrite = await confirm({
                message: `Directory "${projectName}" already exists. Overwrite?`,
                default: false,
            });
            if (!overwrite) {
                this.log('\n🚫 Aborted.\n');
                return;
            }
            await fs.remove(outputDir);
        }

        // ── 3. Resolve template ──────────────────────────────────────────────
        const templatesRoot = path.resolve(__dirname, '../../../../templates');
        const templateDir = path.join(templatesRoot, template);

        if (!(await fs.pathExists(templateDir))) {
            this.log(`\n❌  Template "${template}" not found at ${templateDir}\n`);
            process.exitCode = 1;
            return;
        }

        this.log('');

        // ── 4. Render template ───────────────────────────────────────────────
        await this.runWithSpinner(`Scaffolding ${projectName}…`, async () => {
            await renderTemplate(templateDir, outputDir, { projectName });
        });

        // ── 5. Write kode.config.js ──────────────────────────────────────────
        await this.writeKodeConfig(outputDir, projectName, template);

        // ── 6. Install dependencies ──────────────────────────────────────────
        if (!flags['no-install']) {
            await this.runWithSpinner('Installing dependencies…', async () => {
                await execa('npm', ['install'], { cwd: outputDir });
            });
        }

        // ── 7. Initialize Git ────────────────────────────────────────────────
        let repoUrl = '';
        if (!flags['no-git']) {
            await this.runWithSpinner('Initializing Git…', async () => {
                const git = simpleGit(outputDir);
                await git.init();
                await git.addConfig('user.email', 'kode-cli@init', false, 'local');
                await git.addConfig('user.name', 'kode init', false, 'local');
                await git.add('.');
                await git.commit('chore: initial commit');
            });

            // ── 8. Create GitHub repo ────────────────────────────────────────
            if (!flags['no-github']) {
                repoUrl = await this.createGitHubRepo(projectName, outputDir);
            }
        }

        // ── 9. Done ──────────────────────────────────────────────────────────
        this.log(`
✅ Done! Your project is ready.

   ${this.dim('cd')} ${projectName}
   ${this.dim('npm run dev')}       ${this.dim('# start development server')}
   ${this.dim('kode setup')}        ${this.dim('# install Git hooks')}
   ${this.dim('kode commit')}       ${this.dim('# AI-powered commits')}
${repoUrl ? `\n   🔗 GitHub: ${repoUrl}\n` : ''}`);
    }

    private async createGitHubRepo(
        projectName: string,
        outputDir: string
    ): Promise<string> {
        // Check if gh CLI is installed
        try {
            await execa('gh', ['--version']);
        } catch {
            this.log(`\n${this.dim('ℹ️  GitHub CLI not found — skipping repo creation.')}`);
            this.log(`${this.dim('   Install it at: https://cli.github.com')}\n`);
            return '';
        }

        // Check if user is logged in
        try {
            await execa('gh', ['auth', 'status']);
        } catch {
            this.log(`\n${this.dim('ℹ️  Not logged into GitHub CLI — skipping repo creation.')}`);
            this.log(`${this.dim('   Run: gh auth login')}\n`);
            return '';
        }

        const createRepo = await confirm({
            message: `Create a GitHub repository for "${projectName}"?`,
            default: true,
        });

        if (!createRepo) return '';

        const isPrivate = await select({
            message: 'Repository visibility:',
            choices: [
                { name: 'Private', value: true },
                { name: 'Public', value: false },
            ],
        });

        let repoUrl = '';

        await this.runWithSpinner('Creating GitHub repository…', async () => {
            const visibility = isPrivate ? '--private' : '--public';
            const result = await execa(
                'gh',
                ['repo', 'create', projectName, visibility, '--source=.', '--remote=origin', '--push'],
                { cwd: outputDir }
            );
            // Extract URL from gh output
            const match = result.stdout.match(/https:\/\/github\.com\/\S+/);
            repoUrl = match ? match[0] : '';
        });

        return repoUrl;
    }

    private async runWithSpinner(label: string, fn: () => Promise<void>): Promise<void> {
        const { unmount, rerender } = render(
            React.createElement(Spinner, { label })
        );
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

    private async writeKodeConfig(
        outputDir: string,
        projectName: string,
        template: Template
    ): Promise<void> {
        const configContent = `/** @type {import('@kode/core').KodeConfig} */
module.exports = {
  project: {
    name: '${projectName}',
    template: '${template}',
  },
  git: {
    branchPattern: /^(feature|fix|chore|docs|refactor|test)\\/[a-z0-9-]+$/,
    commitStyle: 'conventional-commits',
    autoGenerateMessages: true,
  },
  quality: {
    lint: true,
    test: true,
    security: false,
    coverage: {
      enabled: false,
      threshold: 80,
    },
  },
  ide: {
    reviewOnSave: true,
    reviewSeverityThreshold: 'warning',
    aiModel: 'claude-sonnet-4-6',
  },
};
`;
        await fs.writeFile(path.join(outputDir, 'kode.config.ts'), configContent, 'utf-8');
    }

    private dim(text: string): string {
        return `\x1b[2m${text}\x1b[0m`;
    }
}