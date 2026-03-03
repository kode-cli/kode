import { Command } from '@oclif/core';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
class Setup extends Command {
    async run() {
        const cwd = process.cwd();
        // ── 1. Check we're in a git repo ─────────────────────────────────────
        if (!(await fs.pathExists(path.join(cwd, '.git')))) {
            this.log('\n❌  Not a Git repository. Run `git init` first.\n');
            process.exitCode = 1;
            return;
        }
        // ── 2. Install Husky ─────────────────────────────────────────────────
        this.log('📦 Installing Husky…');
        await execa('npm', ['install', '--save-dev', 'husky'], { cwd });
        await execa('npx', ['husky', 'init'], { cwd });
        // ── 3. Write pre-push hook ───────────────────────────────────────────
        const prePushPath = path.join(cwd, '.husky', 'pre-push');
        await fs.outputFile(prePushPath, '#!/bin/sh\nkode check\n', { mode: 0o755 });
        this.log('🔗 Pre-push hook installed → runs `kode check` before every push.');
        // ── 4. Write post-checkout hook ──────────────────────────────────────
        const postCheckoutPath = path.join(cwd, '.husky', 'post-checkout');
        await fs.outputFile(postCheckoutPath, `#!/bin/sh
BRANCH_CHECKOUT=$3
if [ "$BRANCH_CHECKOUT" = "0" ]; then exit 0; fi
BRANCH=$(git rev-parse --abbrev-ref HEAD)
case "$BRANCH" in
  HEAD|main|master|develop) exit 0 ;;
esac
echo "$BRANCH" | grep -qE '^(feature|fix|chore|docs|refactor|test)/[a-z0-9-]+$' || \\
  echo "⚠️  Branch \\"$BRANCH\\" doesn't follow convention: <type>/<description>"
`, { mode: 0o755 });
        this.log('🔗 Post-checkout hook installed → warns on invalid branch names.');
        // ── 5. Add prepare script ────────────────────────────────────────────
        const pkgPath = path.join(cwd, 'package.json');
        if (await fs.pathExists(pkgPath)) {
            const pkg = await fs.readJson(pkgPath);
            pkg.scripts = pkg.scripts ?? {};
            if (!pkg.scripts.prepare) {
                pkg.scripts.prepare = 'husky';
                await fs.writeJson(pkgPath, pkg, { spaces: 2 });
                this.log('📝 Added `prepare` script to package.json.');
            }
        }
        // ── 6. Write .editorconfig ───────────────────────────────────────────
        const editorconfigPath = path.join(cwd, '.editorconfig');
        if (!(await fs.pathExists(editorconfigPath))) {
            await fs.writeFile(editorconfigPath, `# EditorConfig — https://editorconfig.org
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false

[Makefile]
indent_style = tab
`, 'utf-8');
            this.log('✏️  Created .editorconfig.');
        }
        // ── 7. Write .prettierrc ─────────────────────────────────────────────
        const prettierPath = path.join(cwd, '.prettierrc');
        if (!(await fs.pathExists(prettierPath))) {
            await fs.writeJson(prettierPath, {
                semi: true,
                singleQuote: true,
                trailingComma: 'es5',
                printWidth: 100,
                tabWidth: 2,
                endOfLine: 'lf',
            }, { spaces: 2 });
            this.log('✨ Created .prettierrc.');
        }
        // ── 8. Write .prettierignore ─────────────────────────────────────────
        const prettierIgnorePath = path.join(cwd, '.prettierignore');
        if (!(await fs.pathExists(prettierIgnorePath))) {
            await fs.writeFile(prettierIgnorePath, 'node_modules\ndist\ncoverage\n.husky\n', 'utf-8');
        }
        this.log('\n✅ Kode setup complete!\n');
        this.log('   Git hooks  → pre-push runs `kode check`, post-checkout validates branch names');
        this.log('   Formatting → .editorconfig + .prettierrc added');
        this.log('\n   Run `kode check --fix` to auto-fix lint + formatting issues.\n');
    }
}
Setup.description = 'Install Kode Git hooks and code style config into the current project';
Setup.examples = [
    '$ kode setup',
];
export default Setup;
//# sourceMappingURL=setup.js.map