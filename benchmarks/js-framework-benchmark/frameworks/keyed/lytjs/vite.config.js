import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    minify: 'terser',
    terserOptions: {
      compress: {
        passes: 2
      }
    },
    rollupOptions: {
      input: 'index.html',
      output: {
        manualChunks: undefined
      }
    }
  },
  resolve: {
    alias: {
      '@lytjs/reactivity': '/packages/reactivity/src/index.js'
    }
  }
});
