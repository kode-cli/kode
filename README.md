<div align="center">

<img src="https://img.shields.io/badge/kode-CLI-000000?style=for-the-badge&logoColor=white" alt="Kode CLI" />

# Kode

**The AI-powered developer productivity suite.**  
Scaffold projects, write smarter commits, enforce quality, deploy to staging and production — all from your terminal.

[![npm version](https://img.shields.io/npm/v/@kode-tools/cli?color=000&style=flat-square)](https://www.npmjs.com/package/@kode-tools/cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-000?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-000?style=flat-square)](https://nodejs.org)
[![Built with Claude](https://img.shields.io/badge/AI-Claude%20API-000?style=flat-square)](https://anthropic.com)
[![GitHub Issues](https://img.shields.io/github/issues/kode-cli/kode?color=000&style=flat-square)](https://github.com/kode-cli/kode/issues)

[Installation](#installation) · [Getting Started](#getting-started) · [Commands](#commands) · [Deployment](#deployment) · [Configuration](#configuration) · [VS Code Extension](#vs-code-extension) · [Contributing](#contributing)

---

</div>

## What is Kode?

Kode is a developer productivity suite built around a single idea: **your tools should do the repetitive work so you can focus on building**.

It wraps your entire development workflow — from project scaffolding to production deployment — into a set of composable CLI commands powered by Claude AI. Install it once globally, and it works from any project, in any terminal, forever.

```bash
# Works from anywhere on your laptop — no setup, no exports
cd ~/any-project

kode commit -p          # stage → lint → test → AI message → push
kode deploy --staging   # build → docker → health check
kode deploy --prod      # build → SSH → rolling deploy → notify Slack
kode doctor             # verify your whole setup in one command
```

---

## Features

| Category | What Kode does |
|---|---|
| **Global** | Persistent API key storage — set once, works in every terminal forever |
| **Scaffolding** | Spin up new projects with templates, Git, and GitHub repos in seconds |
| **AI Commits** | Generate Conventional Commit messages from your staged diff |
| **Quality Gate** | Lint, test, and security scan before every push — automatically |
| **Git Automation** | Smarter `diff`, `log`, `blame`, `sync`, `undo`, and `status` |
| **Code Generation** | AI generates features, tests, and JSDoc comments for your files |
| **Deployment** | Config-driven deploy to Docker Desktop (staging) and remote SSH (production) |
| **VS Code Plugin** | Inline code review, AI chat, and code generation inside your editor |

---

## Installation

### Prerequisites

| Tool | Required for |
|---|---|
| Node.js ≥ 18 | Everything |
| Git | All git commands |
| Docker Desktop | Staging deployments |
| Anthropic API key | All AI features |

### Install globally

```bash
npm install -g @kode-tools/cli
```

### One-time setup

```bash
here is the apikey for testing: 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
# 1. Store your API key — never type export again
kode config set ANTHROPIC_API_KEY sk-ant-your-key-here

# 2. Verify everything is working
kode doctor

# 3. Install shell tab completions
kode completion install
source ~/.zshrc   # or ~/.bashrc
```

From this point on, `kode` works from any directory in any terminal with no additional setup.

---

## Getting Started

```bash
# Scaffold a new project
kode init my-api --template node-express

# Move in and configure Git hooks + formatting
cd my-api
kode setup

# Build something, then ship it
kode commit -p
```

---

## Commands

### Setup & Health

| Command | Description |
|---|---|
| `kode doctor` | Check Node, API key, Docker, Git, and GitHub CLI in one shot |
| `kode config set <KEY> <VALUE>` | Store a value in `~/.kode/config.json` |
| `kode config get <KEY>` | Read a stored value |
| `kode config list` | Show all stored values (secrets masked) |
| `kode config delete <KEY>` | Remove a stored value |
| `kode completion install` | Install shell completions (auto-detects zsh/bash/fish) |
| `kode completion install --zsh` | Force zsh |
| `kode completion install --bash` | Force bash |
| `kode completion install --fish` | Force fish |
| `kode completion uninstall` | Remove shell completions |

### Project

| Command | Description |
|---|---|
| `kode init <n>` | Scaffold a new project from a template |
| `kode init <n> --template react-app` | Use a specific template |
| `kode init <n> --no-install` | Skip installing dependencies |
| `kode add <feature>` | AI generates a new feature or component |
| `kode rename <old> <new>` | Safely rename a function/variable across the whole project |

### Git & Commits

| Command | Description |
|---|---|
| `kode commit` | Stage all → run checks → generate AI commit message |
| `kode commit -p` | Same as above, then push to remote |
| `kode commit --no-check` | Skip quality checks |
| `kode commit --no-add` | Use already-staged files only |
| `kode pr` | Generate AI pull request description from commits |
| `kode sync` | Pull (rebase) + push in one command |
| `kode undo` | Revert last commit, keep changes staged |
| `kode undo --hard` | Discard last commit and all changes permanently |

### Inspection

| Command | Description |
|---|---|
| `kode status` | Git status + branch + recent commits, beautifully formatted |
| `kode diff` | AI explanation of current unstaged changes |
| `kode diff --staged` | AI explanation of staged changes only |
| `kode log` | AI-summarized commit history |
| `kode log -n 20` | Show last 20 commits |
| `kode blame <file>` | Who changed what in a file, with AI insights |
| `kode whoami` | Current git user, remote URL, and branch |
| `kode open` | Open GitHub repo in the browser |
| `kode open --prs` | Open the pull requests page |
| `kode open --issues` | Open the issues page |
| `kode open --actions` | Open GitHub Actions |
| `kode stats` | Files, lines of code, top contributors |

### Quality

| Command | Description |
|---|---|
| `kode check` | Run lint + tests + security scan with live progress spinners |
| `kode check --fix` | Auto-fix lint and formatting issues |
| `kode check --only lint` | Run a single check by name |
| `kode setup` | Install Git hooks + `.editorconfig` + `.prettierrc` |

### AI Code Tools

| Command | Description |
|---|---|
| `kode docs <file>` | Generate JSDoc/TSDoc comments for a file |
| `kode docs <file> --write` | Save the documented version back to the file |
| `kode test <file>` | Generate a Vitest test file for a source file |
| `kode test <file> --write` | Save the test file to disk |

### Deployment

| Command | Description |
|---|---|
| `kode deploy:init` | Interactive wizard — generates `kode.deploy.config.js` |
| `kode deploy` | Deploy to default environment (staging) |
| `kode deploy --staging` | Build Docker image → run on Docker Desktop |
| `kode deploy --prod` | Build → SSH to server → rolling deploy → health check |
| `kode deploy --dry-run` | Validate config and SSH connections without deploying |
| `kode deploy --no-check` | Skip pre-deploy quality gate |
| `kode deploy:status` | Show live container status per environment |
| `kode rollback` | Interactive — choose from previous versions |
| `kode rollback --env production` | Rollback a specific environment |
| `kode rollback --version v1.2.3` | Rollback to a specific image tag |
| `kode history` | Show full deployment history |
| `kode history --env production` | Filter by environment |

---

## Global Config

Kode stores your configuration in `~/.kode/config.json` with file permissions `600` — only your user can read it. Values are injected automatically before every command runs, so you never need to `export` anything.

```bash
kode config set ANTHROPIC_API_KEY sk-ant-...
kode config set SLACK_WEBHOOK_URL https://hooks.slack.com/...

kode config list
#  📁 /Users/you/.kode/config.json
#  ───────────────────────────────────────────────────────
#  ANTHROPIC_API_KEY                sk-ant-••••••••api4
#  SLACK_WEBHOOK_URL                https://hooks.sl••••••••g/T
#  ───────────────────────────────────────────────────────
```

Shell environment always wins — if `ANTHROPIC_API_KEY` is already set in your shell, Kode uses that and ignores the stored value.

---

## Deployment

Kode's deployment feature is config-driven. One file controls Docker builds, SSH connections, health checks, rollbacks, and Slack notifications.

### How the pipeline runs

```
Trigger → Config Load → Pre-Deploy Checks → Docker Build
       → Deploy (Staging or Production) → Health Check
       → Post-Deploy Hooks → Notify Slack
```

### Quick start

```bash
kode deploy:init          # generate config interactively
kode deploy --dry-run     # validate without deploying
kode deploy --staging     # deploy to Docker Desktop
kode deploy:status        # check running containers
kode deploy --prod        # deploy to production
```

### Deploy config — `kode.deploy.config.js`

Only `project.name` is required:

```js
/** @type {import('@kode-tools/core').DeployConfig} */
module.exports = {

  project: {
    name: 'my-app',                   // ✅ only required field
    dockerfile: './Dockerfile',
    buildContext: '.',
    // registry: 'ghcr.io/my-org',
  },

  environments: {
    staging: {
      target: 'docker-desktop',
      port: 3001,
      restartPolicy: 'unless-stopped',
      // envFile: '.env.staging',
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
      // envFile: '.env.production',
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
    confirmProduction: true,   // set false for CI/CD
  },

};
```

### Staging deployment (Docker Desktop)

```bash
# Make sure Docker Desktop is running
docker info

kode deploy --staging

# Verify
docker ps
curl http://localhost:3001/health    # → {"status":"ok"}
docker logs my-app-staging
```

### Production deployment (remote SSH)

```bash
# Set up SSH access (one time)
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""
ssh-copy-id -i ~/.ssh/deploy_key.pub deploy@your-server

# Set server IP
kode config set PROD_SERVER_IP 123.456.789.0

# Dry run first
kode deploy --prod --dry-run

# Deploy — prompts for confirmation
kode deploy --prod
```

### Deploy strategies

| Strategy | How it works | Best for |
|---|---|---|
| `rolling` | One server at a time — old version stays live during rollout | Stateless APIs, gradual rollouts |
| `blue-green` | All new containers start before traffic cuts over | Zero-downtime, instant rollback |

### Hook variables

All hook scripts receive these automatically:

| Variable | Example |
|---|---|
| `$IMAGE_TAG` | `ghcr.io/kode-cli/my-app:v1.0.0-a1b2c3d` |
| `$VERSION` | `v1.0.0` |
| `$GIT_SHA` | `a1b2c3d` |
| `$ENVIRONMENT` | `staging` or `production` |
| `$SERVER_LABEL` | `prod-1` |

### Health check endpoint

Your app needs a `GET /health` route returning HTTP 200:

```typescript
// Express
app.get('/health', (req, res) => res.json({ status: 'ok' }));
```

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
      - run: npm ci && npm install -g @kode-tools/cli
      - run: kode deploy --staging
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          STAGING_DB:        ${{ secrets.STAGING_DB }}

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm install -g @kode-tools/cli
      - run: kode deploy --prod
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          PROD_SERVER_IP:    ${{ secrets.PROD_SERVER_IP }}
          PROD_DB:           ${{ secrets.PROD_DB }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

> Set `cli: { confirmProduction: false }` in your deploy config when running in CI so the production confirmation prompt doesn't hang the pipeline.

---

## How the quality gate works

```
kode commit -p

  ✅  Staging all changes…

  🔍  Running quality checks…
  ✅  ESLint       412ms
  ✅  Tests        1843ms
  ✅  All checks passed!

  ✅  Generating commit message…

  Suggested: feat(auth): add JWT refresh token logic
  ? Use this message? Yes

  ✅  Committed
  ✅  Pushing to remote…
  🚀  Pushed.
```

If checks fail, you're prompted whether to fix or force-continue:

```
  ❌  ESLint       389ms
     src/index.ts
       6:7  error  'apiKey' is assigned but never used

  ? Quality checks failed. Commit anyway? No
  🚫  Aborted. Run `kode check --fix` to auto-fix.
```

---

## Templates

### `node-express` — Node.js + Express + TypeScript

```bash
kode init my-api --template node-express
```

Includes: TypeScript, ESLint, Vitest, Dockerfile with `/health` route, CI pipeline.

### `react-app` — Vite + React + TypeScript

```bash
kode init my-app --template react-app
```

Includes: TypeScript, ESLint, Vitest, Vite config, CI pipeline.

---

## VS Code Extension

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com) — search **Kode**.

| Command | Shortcut | Description |
|---|---|---|
| `Kode: Generate Code` | `Cmd+Shift+G` | Stream AI-generated code into the editor |
| `Kode: Explain Code` | — | Plain-English explanation of selected code |
| `Kode: Refactor Code` | — | AI rewrites the selection |
| `Kode: Review File` | — | Inline diagnostics powered by Claude |
| `Kode: Open Chat` | `Cmd+Shift+K` | Context-aware AI chat for the current file |

**Settings** (`Cmd+,` → search Kode):

| Setting | Default | Description |
|---|---|---|
| `kode.reviewOnSave` | `true` | Auto-review file on save |
| `kode.reviewSeverityThreshold` | `warning` | Minimum issue level to show |
| `kode.aiModel` | `claude-sonnet-4-6` | Claude model to use |

---

## Architecture

```
kode/                              github.com/kode-cli/kode
├── packages/
│   ├── core/                      @kode-tools/core — shared engine
│   │   └── src/
│   │       ├── ai/                Claude API client, LRU cache, retry
│   │       ├── config/            Config loading and Zod validation
│   │       ├── global/            ~/.kode/config.json store
│   │       ├── deploy/            Full deployment engine
│   │       │   ├── config.ts      Deploy config schema (Zod)
│   │       │   ├── docker.ts      Image build and push
│   │       │   ├── staging.ts     Docker Desktop deployer
│   │       │   ├── production.ts  SSH deployer (rolling + blue-green)
│   │       │   ├── health.ts      Health check with retry + auto-rollback
│   │       │   ├── hooks.ts       Hook runner with variable injection
│   │       │   ├── notify.ts      Slack notifications
│   │       │   ├── preflight.ts   Pre-deploy checks
│   │       │   └── history.ts     Deployment history log
│   │       ├── git/               GitClient wrapper (simple-git)
│   │       ├── quality/           Lint, test, security runners
│   │       └── templates/         EJS project scaffolding engine
│   │
│   ├── cli/                       @kode-tools/cli — the global command
│   │   ├── bin/run.js             Entry: Node check + config injection
│   │   └── src/commands/          One file per command
│   │
│   └── vscode-extension/          VS Code plugin
│       └── src/
│           ├── ai/                Streaming code generation
│           ├── providers/         Diagnostics and code lens
│           └── webview/           Chat panel (React)
│
├── templates/
│   ├── node-express/
│   └── react-app/
│
└── scripts/
    └── version-sync.js            Bump version across all packages
```

The core design principle: **one shared engine**. The CLI, VS Code extension, and deployment pipeline all import from `@kode-tools/core`. Business logic lives in exactly one place.

---

## Contributing

```bash
# Clone and install
git clone https://github.com/kode-cli/kode.git
cd kode
npm install

# Build all packages
npm run build

# Link CLI globally for local testing
npm run link:global

# Verify your setup
kode doctor

# Create a feature branch
git checkout -b feature/your-feature

# Make your changes, then commit using Kode itself
kode commit -p

# Open a PR
kode pr
```

### Branch naming

Must follow `<type>/<description>`. Valid types: `feature`, `fix`, `chore`, `docs`, `refactor`, `test`.

Example: `feature/add-changelog-command`

### Release process

```bash
npm run version:patch    # 0.1.0 → 0.1.1
npm run version:minor    # 0.1.0 → 0.2.0
npm run version:major    # 0.1.0 → 1.0.0

npm run prerelease       # build + test
npm run publish:cli      # publishes @kode-tools/core first, then @kode-tools/cli

git add -A
git commit -m "chore: release v0.2.0"
git tag v0.2.0
git push && git push --tags
```

---

## Roadmap

- [ ] `kode changelog` — auto-generate `CHANGELOG.md` from commit history
- [ ] `kode branch` — AI-suggested branch name from a task description
- [ ] `kode stash` — named stash with AI-generated description
- [ ] Template registry — publish and install community templates
- [ ] Deploy: Kubernetes provider
- [ ] Deploy: AWS ECS / GCP Cloud Run providers
- [ ] GitHub Actions: native `kode-cli/deploy-action`

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `kode: command not found` | Run `npm run link:global` from monorepo root |
| API key not loading automatically | Run `kode config list` to verify it's stored |
| `kode doctor` shows Docker not running | Open Docker Desktop and wait for it to start |
| SSH connection refused on deploy | Test manually: `ssh deploy@your-server` — check firewall and authorized_keys |
| Health check fails immediately | Increase `startupGrace` in healthCheck config — your app may need more boot time |
| Auto-rollback triggered unexpectedly | Check `docker logs my-app-production` on the server — rollback is a symptom, not the cause |
| Shell completions not working | Run `source ~/.zshrc` (or `~/.bashrc`) in the current terminal after installing |

---

## Links

- **Repository:** [github.com/kode-cli/kode](https://github.com/kode-cli/kode)
- **Issues:** [github.com/kode-cli/kode/issues](https://github.com/kode-cli/kode/issues)
- **npm:** [npmjs.com/package/@kode-tools/cli](https://www.npmjs.com/package/@kode-tools/cli)
- **Powered by:** Kode CLI

---

## License

MIT © [Kode Contributors](https://github.com/kode-cli/kode/graphs/contributors)

---

<div align="center">

Built with [Sovanra] · [Report a bug](https://github.com/kode-cli/kode/issues/new?labels=bug) · [Request a feature](https://github.com/kode-cli/kode/issues/new?labels=enhancement)

</div>