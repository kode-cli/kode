<div align="center">

<img src="https://img.shields.io/badge/kode-CLI-000000?style=for-the-badge&logoColor=white" alt="Kode CLI" />

# Kode

**The AI-powered developer productivity suite.**  
Scaffold projects, write smarter commits, enforce quality, deploy to staging and production — all from your terminal.

[![npm version](https://img.shields.io/npm/v/@kode/cli?color=000&style=flat-square)](https://www.npmjs.com/package/@kode/cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-000?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-000?style=flat-square)](https://nodejs.org)
[![Built with Claude](https://img.shields.io/badge/AI-Claude%20API-000?style=flat-square)](https://anthropic.com)

[Getting Started](#getting-started) · [Commands](#commands) · [Configuration](#configuration) · [Deployment](#deployment) · [VS Code Extension](#vs-code-extension) · [Contributing](#contributing)

---

</div>

## What is Kode?

Kode is a developer productivity suite built around a single idea: **your tools should do the repetitive work so you can focus on building**.

It wraps your entire development workflow — from project scaffolding to production deployment — into a set of composable CLI commands powered by Claude AI. Every command is designed to work standalone or chain together into a seamless pipeline.

```bash
# One command does it all
kode commit -p
# → stages all files
# → runs lint + tests
# → generates an AI commit message
# → pushes to remote

# Deploy to staging with one command
kode deploy --staging
# → runs pre-deploy checks
# → builds Docker image
# → starts container on Docker Desktop
# → health checks your app
```

---

## Features

| Category | What Kode does |
|---|---|
| **Scaffolding** | Spin up new projects with templates, Git, and GitHub repos in seconds |
| **AI Commits** | Generate Conventional Commits messages from your staged diff |
| **Quality Gate** | Lint, test, and security scan before every push — automatically |
| **Git Automation** | Smarter `diff`, `log`, `blame`, `sync`, `undo`, and `status` |
| **Code Generation** | AI generates features, tests, and JSDoc comments for your files |
| **Deployment** | Config-driven deploy to Docker Desktop (staging) and remote SSH (production) |
| **VS Code Plugin** | Inline code review, AI chat, and code generation inside your editor |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18.0.0
- Git
- Docker Desktop (for staging deployments)
- An [Anthropic API key](https://console.anthropic.com) (for AI features)

### Installation

```bash
npm install -g @kode/cli
```

### Set your API key

```bash
export ANTHROPIC_API_KEY=your-key-here

# Make it permanent
echo 'export ANTHROPIC_API_KEY=your-key-here' >> ~/.zshrc
```

### Your first project

```bash
# Scaffold a new project
kode init my-api --template node-express

# Move in and set up hooks
cd my-api
kode setup

# Start building, then ship
kode commit -p
```

---

## Commands

### Project

| Command | Description |
|---|---|
| `kode init <name>` | Scaffold a new project from a template |
| `kode init <name> --template react-app` | Use a specific template |
| `kode init <name> --no-install` | Skip installing dependencies |
| `kode add <feature>` | AI generates a new feature or component |
| `kode rename <old> <new>` | Safely rename across the entire project |

### Git & Commits

| Command | Description |
|---|---|
| `kode commit` | Stage all, run checks, generate AI commit message |
| `kode commit -p` | Same as above, then push to remote |
| `kode commit --no-check` | Skip quality checks |
| `kode commit --no-add` | Use already-staged files only |
| `kode pr` | Generate AI pull request description from commits |
| `kode sync` | Pull (rebase) + push in one command |
| `kode undo` | Revert last commit, keep changes staged |
| `kode undo --hard` | Discard last commit and all changes |

### Inspection

| Command | Description |
|---|---|
| `kode status` | Beautiful overview of git status + recent commits |
| `kode diff` | AI explanation of current changes |
| `kode diff --staged` | Show only staged changes |
| `kode log` | AI-summarized commit history |
| `kode log -n 20` | Show last 20 commits |
| `kode blame <file>` | Who changed what, with AI insights |
| `kode whoami` | Current git user, remote URL, and branch |
| `kode open` | Open GitHub repo in browser |
| `kode open --prs` | Open pull requests page |
| `kode open --issues` | Open issues page |
| `kode open --actions` | Open GitHub Actions page |
| `kode stats` | Files, lines of code, contributors |

### Quality

| Command | Description |
|---|---|
| `kode check` | Run lint + tests + security scan |
| `kode check --fix` | Auto-fix lint and formatting issues |
| `kode check --only lint` | Run a single check |
| `kode setup` | Install Git hooks + `.editorconfig` + `.prettierrc` |

### AI Code Tools

| Command | Description |
|---|---|
| `kode docs <file>` | Generate JSDoc/TSDoc comments |
| `kode docs <file> --write` | Save documented version to file |
| `kode test <file>` | Generate a Vitest test file |
| `kode test <file> --write` | Save the test file to disk |

### Deployment

| Command | Description |
|---|---|
| `kode deploy:init` | Interactive setup wizard — generates `kode.deploy.config.js` |
| `kode deploy` | Deploy to default environment (staging) |
| `kode deploy --staging` | Deploy to Docker Desktop |
| `kode deploy --prod` | Deploy to remote server via SSH |
| `kode deploy --dry-run` | Validate config and connections, no actual deploy |
| `kode deploy --no-check` | Skip pre-deploy quality gate |
| `kode deploy:status` | Show running container status per environment |
| `kode rollback` | Interactive rollback to a previous version |
| `kode rollback --env production` | Rollback a specific environment |
| `kode rollback --version v1.2.3` | Rollback to a specific image tag |
| `kode history` | Show full deployment history |
| `kode history --env production` | Filter history by environment |

---

## Configuration

### Project config — `kode.config.js`

Create in your project root to configure quality checks, Git rules, and IDE settings:

```js
/** @type {import('@kode/core').KodeConfig} */
module.exports = {
  project: {
    name: 'my-api',
    template: 'node-express',
  },
  git: {
    branchPattern: /^(feature|fix|chore|docs|refactor|test)\/[a-z0-9-]+$/,
    commitStyle: 'conventional-commits',
    autoGenerateMessages: true,
  },
  quality: {
    lint: true,
    test: true,
    security: false,
    coverage: { enabled: false, threshold: 80 },
    customChecks: [
      { name: 'Type check', command: 'tsc --noEmit' },
    ],
  },
  ide: {
    reviewOnSave: true,
    reviewSeverityThreshold: 'warning',
    aiModel: 'claude-sonnet-4-6',
  },
};
```

### Configuration reference

| Field | Type | Default | Description |
|---|---|---|---|
| `git.branchPattern` | `RegExp` | `feature\|fix\|chore...` | Branch naming convention |
| `git.commitStyle` | `string` | `conventional-commits` | Commit message style |
| `quality.lint` | `boolean` | `true` | Run ESLint |
| `quality.test` | `boolean` | `true` | Run Vitest |
| `quality.security` | `boolean` | `false` | Run Semgrep |
| `quality.coverage.threshold` | `number` | `80` | Minimum coverage % |
| `quality.customChecks` | `array` | `[]` | Additional shell commands to run |
| `ide.reviewOnSave` | `boolean` | `true` | Auto-review on file save in VS Code |
| `ide.aiModel` | `string` | `claude-sonnet-4-6` | Claude model for all AI features |

---

## Deployment

Kode's deployment feature is config-driven — one file controls everything from Docker builds to SSH connections, health checks, rollbacks, and Slack notifications.

### How the pipeline runs

```
Trigger → Config Load → Pre-Deploy Checks → Docker Build
       → Deploy (Staging or Production) → Health Check
       → Post-Deploy Hooks → Notify
```

### Quick start

```bash
# 1. Generate your deploy config interactively
kode deploy:init

# 2. Validate everything (no actual deploy)
kode deploy --dry-run

# 3. Deploy to staging
kode deploy --staging

# 4. Check what's running
kode deploy:status

# 5. When ready, deploy to production
kode deploy --prod
```

### Deploy config — `kode.deploy.config.js`

Create in your project root. Only `project.name` is required — everything else has smart defaults:

```js
/** @type {import('@kode/core').DeployConfig} */
module.exports = {

  project: {
    name: 'my-app',                   // ✅ only required field
    dockerfile: './Dockerfile',
    buildContext: '.',
    // registry: 'ghcr.io/my-org',   // required for multi-server production
    // buildArgs: { NODE_VERSION: '20' },
  },

  environments: {
    staging: {
      target: 'docker-desktop',
      port: 3001,
      // envFile: '.env.staging',
      restartPolicy: 'unless-stopped',
    },
    production: {
      target: 'remote-ssh',
      strategy: 'rolling',            // 'rolling' | 'blue-green'
      servers: [
        {
          host: process.env.PROD_SERVER_IP,
          user: 'deploy',
          keyPath: '~/.ssh/deploy_key',
          label: 'prod-1',
        },
      ],
      port: 3000,
    },
  },

  healthCheck: {
    endpoint: '/health',
    retries: 3,
    retryInterval: 10,
    startupGrace: 15,
  },

  rollback: {
    keepVersions: 5,
    autoRollbackOnFail: true,
  },

  hooks: {
    preBuild: ['npm test'],
    postDeploy: {
      staging:    ['npm run seed'],
      production: ['npm run migrate'],
    },
  },

  // notifications: {
  //   slack: {
  //     webhookUrl: process.env.SLACK_WEBHOOK_URL,
  //     channel: '#deployments',
  //   },
  // },

  cli: {
    defaultEnv: 'staging',
    confirmProduction: true,          // set false for CI/CD
  },

};
```

### Staging deployment (Docker Desktop)

```bash
# Make sure Docker Desktop is running
docker info

# Deploy
kode deploy --staging

# Verify
docker ps                            # container should show "Up"
curl http://localhost:3001/health    # should return {"status":"ok"}

# View logs
docker logs my-app-staging
```

### Production deployment (remote SSH)

```bash
# Set up SSH access (one time)
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""
ssh-copy-id -i ~/.ssh/deploy_key.pub deploy@your-server

# Set required env vars
export PROD_SERVER_IP="123.456.789.0"

# Dry run first
kode deploy --prod --dry-run

# Deploy
kode deploy --prod
# → prompts: "Deploy to PRODUCTION? (y/N)"
```

### Deploy strategies

| Strategy | How it works | Best for |
|---|---|---|
| `rolling` | One server at a time, old version stays live during rollout | Stateless APIs, gradual rollouts |
| `blue-green` | All new containers start before traffic cuts over | Zero-downtime, instant rollback |

### Rollback

```bash
# Interactive — choose from recent versions
kode rollback

# Roll back a specific environment
kode rollback --env production

# Roll back to a specific version
kode rollback --version v1.2.3-a1b2c3d

# View deployment history
kode history
kode history --env production
```

### Hook variables

All hook scripts receive these environment variables automatically:

| Variable | Example value |
|---|---|
| `$IMAGE_TAG` | `ghcr.io/myorg/my-app:v1.0.0-a1b2c3d` |
| `$VERSION` | `v1.0.0` |
| `$GIT_SHA` | `a1b2c3d` |
| `$ENVIRONMENT` | `staging` or `production` |
| `$SERVER_LABEL` | `prod-1` |

### CI/CD integration

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: kode deploy --staging
        env:
          STAGING_DB: ${{ secrets.STAGING_DB }}

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: kode deploy --prod
        env:
          PROD_SERVER_IP: ${{ secrets.PROD_SERVER_IP }}
          PROD_DB:        ${{ secrets.PROD_DB }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

> **Important for CI:** Set `cli: { confirmProduction: false }` in your deploy config so the production prompt doesn't hang the pipeline.

### Health check endpoint

Your app needs a `GET /health` route returning HTTP 200:

```typescript
// Express
app.get('/health', (req, res) => res.json({ status: 'ok' }));
```

---

## Templates

Kode ships with two built-in templates:

### `node-express`

A production-ready Node.js + Express API with TypeScript, ESLint, Vitest, and a CI pipeline.

```bash
kode init my-api --template node-express
```

```
my-api/
├── src/
│   └── index.ts        # Express entry point with /health route
├── eslint.config.js
├── tsconfig.json
├── vitest.config.ts
├── kode.config.js
└── package.json
```

### `react-app`

A Vite + React + TypeScript app with ESLint, Vitest, and a CI pipeline.

```bash
kode init my-app --template react-app
```

```
my-app/
├── src/
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── vite.config.ts
├── tsconfig.json
├── kode.config.js
└── package.json
```

---

## VS Code Extension

The Kode VS Code extension brings AI directly into your editor.

### Installation

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com) by searching **Kode**.

### Features

| Command | Shortcut | Description |
|---|---|---|
| `Kode: Generate Code` | `Cmd+Shift+G` | Stream AI-generated code into the editor |
| `Kode: Explain Code` | — | Plain-English explanation of selected code |
| `Kode: Refactor Code` | — | Rewrite selection (Extract Function, Add Types, etc.) |
| `Kode: Review File` | — | Inline diagnostics with AI-detected issues |
| `Kode: Open Chat` | `Cmd+Shift+K` | Context-aware AI chat panel for the current file |

### Settings

Open VS Code Settings (`Cmd+,`) and search **Kode**:

| Setting | Default | Description |
|---|---|---|
| `kode.reviewOnSave` | `true` | Auto-review file on save |
| `kode.reviewSeverityThreshold` | `warning` | Minimum issue level to show |
| `kode.aiModel` | `claude-sonnet-4-6` | Claude model to use |

---

## How the quality gate works

When you run `kode commit` or `kode check`, Kode runs your configured checks sequentially and stops on the first failure:

```
✅  Staging all changes…

🔍 Running quality checks…

✅ ESLint                      412ms
✅ Tests                       1843ms

✅ All 2 checks passed!

✅  Generating commit message…

Suggested message:

  feat(auth): add JWT refresh token logic

? Use this message? Yes

✅ Committed: "feat(auth): add JWT refresh token logic"
✅  Pushing to remote…
🚀 Pushed to remote.
```

If checks fail you're prompted whether to proceed or abort:

```
❌ ESLint                      389ms

   src/index.ts
     6:7  error  'apiKey' is assigned a value but never used

❌ 1 check failed.
   Run `kode check --fix` to auto-fix lint issues.
```

---

## Architecture

Kode is a monorepo with three packages:

```
kode/
├── packages/
│   ├── core/                    @kode/core — shared engine
│   │   └── src/
│   │       ├── ai/              Claude API client, cache, retry
│   │       ├── config/          Config loading and validation
│   │       ├── deploy/          Full deployment engine
│   │       │   ├── config.ts    Deploy config schema (Zod)
│   │       │   ├── docker.ts    Image build and push
│   │       │   ├── staging.ts   Docker Desktop deployer
│   │       │   ├── production.ts SSH deployer (rolling + blue-green)
│   │       │   ├── health.ts    Health check with auto-retry
│   │       │   ├── hooks.ts     Hook runner with variable injection
│   │       │   ├── notify.ts    Slack notifications
│   │       │   ├── preflight.ts Pre-deploy checks
│   │       │   └── history.ts   Deployment history log
│   │       ├── git/             GitClient wrapper
│   │       ├── quality/         Lint, test, security runners
│   │       └── templates/       EJS template engine
│   │
│   ├── cli/                     @kode/cli — CLI tool
│   │   └── src/
│   │       └── commands/        One file per command
│   │
│   └── vscode-extension/        VS Code plugin
│       └── src/
│           ├── ai/              Streaming code generation
│           ├── providers/       Diagnostics and code actions
│           └── webview/         Chat panel
│
└── templates/
    ├── node-express/
    └── react-app/
```

The key design principle is the **shared Core Engine** — the CLI, VS Code extension, and deployment pipeline all import from `@kode/core`. Business logic lives in one place.

---

## Contributing

```bash
# Clone and install
git clone https://github.com/yourname/kode.git
cd kode
npm install

# Build all packages
npm run build

# Run all tests
npm test

# Link CLI globally for local testing
cd packages/cli && npm link

# Create a feature branch
git checkout -b feature/your-feature

# Commit and push using Kode itself
kode commit -p

# Open a PR
kode pr
```

### Branch naming

Branches must follow: `<type>/<description>`

Valid types: `feature`, `fix`, `chore`, `docs`, `refactor`, `test`

Example: `feature/add-changelog-command`

---

## Roadmap

- [ ] `kode changelog` — auto-generate `CHANGELOG.md` from commit history
- [ ] `kode branch` — AI-suggested branch name from a task description
- [ ] `kode stash` — named stash with AI-generated message
- [ ] Template registry — publish and install community templates
- [ ] Deploy: Kubernetes support
- [ ] Deploy: AWS ECS / GCP Cloud Run providers

---

## License

MIT © Kode Contributors

---

<div align="center">

Built with ❤️ by the Kode Team.  
Contributions welcome! Check out the [contributing guide](CONTRIBUTING.md) and our [GitHub repo]()

</div>