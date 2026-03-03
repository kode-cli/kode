// Root ESLint flat config — shared across all packages in the monorepo.
// Individual packages can extend or override by importing this in their own eslint.config.js.
import tseslint from 'typescript-eslint';

export default tseslint.config(
    ...tseslint.configs.recommended,
    {
        ignores: ['dist/**', 'node_modules/**', '**/*.js', '**/*.cjs'],
        rules: {
            // Disallow unused variables, but allow underscore-prefixed ones (e.g. _unused)
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            // Warn on explicit `any` usage instead of hard error — too noisy in a broad monorepo config
            '@typescript-eslint/no-explicit-any': 'warn',
            // Allow empty catch blocks (common in graceful fallback patterns)
            'no-empty': ['error', { allowEmptyCatchBlocks: true }],
        },
    }
);

