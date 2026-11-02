import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => ({
  root,
  base: mode === 'hosted' ? '/' : '/site/',
  plugins: [react()],
  build: {
    outDir: mode === 'hosted' ? '../overlay/dist-hosted' : 'dist',
    emptyOutDir: false,
    target: 'chrome100',
    sourcemap: false,
    rollupOptions: {
      input: {
        home: fileURLToPath(new URL('./index.html', import.meta.url)),
        about: fileURLToPath(new URL('./about.html', import.meta.url)),
        support: fileURLToPath(new URL('./support.html', import.meta.url)),
      },
    },
  },
}));
