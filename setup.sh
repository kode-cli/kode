#!/usr/bin/env bash
# =============================================================================
# Kode — Stage 1.1 Setup Script (npm)
# =============================================================================

set -e

echo ""
echo "🚀 Kode — Stage 1.1 Setup"
echo "============================================"

# ── 1. Check prerequisites ───────────────────────────────────────────────────

echo ""
echo "📋 Checking prerequisites..."

# Node.js >= 18
node_version=$(node -v | sed 's/v//' | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
  echo "❌ Node.js 18+ required. You have $(node -v)"
  exit 1
fi
echo "  ✅ Node.js $(node -v)"

# Find npm explicitly — avoid pnpm shims
NPM_BIN=$(which -a npm | grep -v pnpm | head -1)
if [ -z "$NPM_BIN" ]; then
  # fallback: use npm directly from node installation
  NPM_BIN=$(dirname $(which node))/npm
fi

echo "  ✅ npm $($NPM_BIN -v) at $NPM_BIN"

# Warn if pnpm is the default
if command -v pnpm &> /dev/null; then
  echo "  ⚠️  pnpm detected on system — this project uses npm"
  echo "     Using npm explicitly: $NPM_BIN"
fi

# git
if ! command -v git &> /dev/null; then
  echo "❌ Git is required but not found."
  exit 1
fi
echo "  ✅ git $(git --version | awk '{print $3}')"

# ── 2. Install dependencies ───────────────────────────────────────────────────

echo ""
echo "📦 Installing all workspace dependencies..."
$NPM_BIN install

# ── 3. Build all packages ────────────────────────────────────────────────────

echo ""
echo "🔨 Building all packages..."
$NPM_BIN run build

# ── 4. Run tests ─────────────────────────────────────────────────────────────

echo ""
echo "🧪 Running Stage 1.1 tests..."
$NPM_BIN test

# ── 5. Verify workspace links ────────────────────────────────────────────────

echo ""
echo "🔗 Verifying workspace package links..."

if [ -d "node_modules/@kode/core" ]; then
  echo "  ✅ @kode/core linked in node_modules"
else
  echo "  ⚠️  @kode/core not found — run: $NPM_BIN install"
fi

# ── 6. Initialize Git ────────────────────────────────────────────────────────

echo ""
echo "🔧 Setting up Git..."

if [ ! -d ".git" ]; then
  git init
  git add .
  git commit -m "chore: initial monorepo scaffold (Stage 1.1)"
  echo "  ✅ Git initialized"
else
  echo "  ✅ Git already initialized"
fi

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo "============================================"
echo "✅ Stage 1.1 complete!"
echo ""
echo "IMPORTANT: Always use npm (not pnpm) in this project:"
echo "  npm install"
echo "  npm run build"
echo "  npm test"
echo ""
echo "When ready, tell Claude to proceed to Stage 1.2"
echo ""