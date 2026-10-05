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
  // ★ 2026-10-05 补上：缺这一段时 tsup 默认把 ESM 产物命名成 `index.js`，
  //   而 package.json 声明的 `module` / `exports.import` 是 `./dist/index.mjs`
  //   ⇒ 两者不一致 ⇒ **该包无法被任何 ESM 消费方加载**。
  //   写法与本仓其它包（如 common/is）保持一致。
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.mjs' };
  },
  splitting: false,
  treeshake: true,
  external: [/@lytjs\//],
});
