import { defineConfig } from 'tsup';
import { copyFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  define: {
    __DEV__: 'false',
  },
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    };
  },
  external: [
    '@lytjs/common-is',
    '@lytjs/common-env',
    '@lytjs/common-dom',
    '@lytjs/reactivity',
    '@lytjs/component',
    '@lytjs/vdom',
    '@lytjs/core',
  ],
  onSuccess: () => {
    // 复制 CSS 文件到 dist 目录
    copyFileSync(
      resolve(__dirname, 'src/styles/index.css'),
      resolve(__dirname, 'dist/index.css')
    );
    console.log('✓ CSS file copied to dist/index.css');
  },
});
