import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 3100, open: true },
  build: { outDir: 'dist', sourcemap: true },
});
