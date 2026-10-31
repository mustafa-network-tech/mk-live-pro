// Vercel gibi uzak bir https adresinde yayınlanacak overlay derlemesi (kök adres, base '/').
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/',
  plugins: [react()],
  build: { outDir: 'dist-hosted', emptyOutDir: true, target: 'chrome100', sourcemap: false },
});
