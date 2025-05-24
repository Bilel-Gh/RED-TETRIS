import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'client/src/**/*.test.js',
      'client/src/**/*.test.jsx',
      'client/src/**/__tests__/**/*.test.js',
      'client/src/**/__tests__/**/*.test.jsx',
      'server/src/**/__tests__/**/*.test.js'
    ],
    setupFiles: './client/src/setupTests.js',
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
        '**/*.test.jsx',
        '**/__tests__/**'
      ]
    }
  }
});
