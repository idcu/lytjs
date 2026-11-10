import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 3200, open: true },
  build: { outDir: 'dist', sourcemap: true },
});
