import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/src/**/*.test.js', '**/src/**/__tests__/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'client/src/**/*.js',
        'client/src/**/*.jsx',
        'client/src/**/*.ts',
        'client/src/**/*.tsx',
        'server/src/**/*.js'
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.config.js',
        '**/*.test.js',
        '**/__tests__/**'
      ]
    }
  }
});
