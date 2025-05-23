import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    port: 5173,
    // This ensures that the history API fallbacks to index.html
    // which is needed for SPA routing to work properly
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // setupFiles: './src/setupTests.js', // User may need to create/adjust this
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true, // Report coverage for all files specified in include, even if not tested
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'src/main.jsx', // Often excluded as it's an entry point
        'src/setupTests.js', // Test setup files
        'src/**/test?(s).{js,jsx,ts,tsx}', // Test files themselves
        'src/**/mocks/**/*', // Mocks
        // Add other patterns like storybook files, type definitions etc. if needed
        'src/**/*.d.ts',
        'src/**/stories/**/*',
        'src/vite-env.d.ts',
      ],
      lines: 70,
      functions: 70,
      branches: 50,
      statements: 70,
    },
  },
})
