import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    minify: 'terser',
    target: 'esnext'
  },
  server: {
    port: 8080
  }
})
