import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 10000,
    hookTimeout: 10000,
    setupFiles: ['tests/setup/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'shared/**/*.ts',
        'server/**/*.ts',
        'client/src/lib/**/*.ts',
      ],
      exclude: [
        'node_modules',
        'tests',
        'attached_assets',
        '**/*.d.ts',
        'server/vite.ts',
        'server/db.ts',
        'server/index.ts',
        'server/routes.ts',
        'server/storage.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
      '@': path.resolve(__dirname, './client/src'),
    },
  },
});
