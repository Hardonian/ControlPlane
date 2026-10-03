import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ['../../tests/integration/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@controlplane/contract-kit': path.resolve(__dirname, '../contract-kit/dist/index.js'),
      '@controlplane/controlplane': path.resolve(__dirname, '../controlplane/dist/index.js'),
    },
  },
});
