import { defineConfig } from 'vitest/config';
import * as path from "node:path";


export default defineConfig({
  resolve: {
    alias: {
      '@kode/core': path.resolve(__dirname, '../core/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
  },
});