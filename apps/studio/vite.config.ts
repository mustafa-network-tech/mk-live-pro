import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/studio/',
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true, target: 'chrome100', sourcemap: false },
});
