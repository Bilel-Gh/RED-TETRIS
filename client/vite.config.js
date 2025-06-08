import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    port: 5173,
    host: true, // Permet d'exposer le serveur sur le réseau
    open: true, // Ouvre automatiquement le navigateur
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'src/main.jsx',
        'src/setupTests.js',
        'src/**/test?(s).{js,jsx,ts,tsx}',
        'src/**/mocks/**/*',
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
