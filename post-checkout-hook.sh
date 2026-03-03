#!/bin/sh
# .husky/post-checkout
# Validates branch name against kode.config.ts pattern on checkout

PREVIOUS_HEAD=$1
NEW_HEAD=$2
BRANCH_CHECKOUT=$3

# Only run on branch checkouts (not file checkouts)
if [ "$BRANCH_CHECKOUT" = "0" ]; then
  exit 0
fi

BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)

# Skip validation for special branch names
if [ "$BRANCH_NAME" = "HEAD" ] || [ "$BRANCH_NAME" = "main" ] || [ "$BRANCH_NAME" = "master" ] || [ "$BRANCH_NAME" = "develop" ]; then
  exit 0
fi

# Use kode to validate — if kode isn't installed or config missing, skip silently
if command -v kode >/dev/null 2>&1; then
  node -e "
    import('@kode/core').then(({ validateBranchName }) => {
      const pattern = /^(feature|fix|chore|docs|refactor|test)\/[a-z0-9-]+\$/;
      if (!validateBranchName('$BRANCH_NAME', pattern)) {
        console.warn('\n⚠️  Branch name \"$BRANCH_NAME\" does not follow the naming convention.');
        console.warn('   Expected pattern: <type>/<description>');
        console.warn('   Examples: feature/add-login, fix/null-pointer, chore/update-deps\n');
      }
    }).catch(() => {});
  " 2>/dev/null || true
fi

exit 0