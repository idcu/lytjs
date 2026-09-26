import { defineConfig } from 'tsup';

export default defineConfig({
  // 编译期常量：未替换会让使用方在浏览器里 ReferenceError（见根 README 的说明）
  define: {
    __DEV__: 'false',
  },
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'es2020',
  outDir: 'dist',
  splitting: false,
  treeshake: true,
  external: [/@lytjs\//],
});
