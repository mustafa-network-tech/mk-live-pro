import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const hosted = mode === 'hosted';

  return {
    root,
    base: hosted ? '/' : '/legal/',
    plugins: [react()],
    build: {
      outDir: hosted ? '../overlay/dist-hosted' : 'dist',
      emptyOutDir: false,
      target: 'chrome100',
      sourcemap: false,
      rollupOptions: {
        input: {
          terms: fileURLToPath(new URL('./terms.html', import.meta.url)),
          privacy: fileURLToPath(new URL('./privacy.html', import.meta.url)),
        },
      },
    },
  };
});
