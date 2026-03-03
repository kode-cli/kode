import { defineConfig } from 'vitest/config';
import * as path from "node:path";

export default defineConfig({
    resolve: {
        alias: {
            '@kode/core': path.resolve(__dirname, '../core/src/index.ts'),
            'vscode': path.resolve(__dirname, '__mocks__/vscode.ts'),
            '@anthropic-ai/sdk': path.resolve(__dirname, '__mocks__/@anthropic-ai/sdk.ts'),
        },
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});