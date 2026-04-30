import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
  // 使用正则通配符匹配所有 @lytjs/common-* 子包
  external: [/^@lytjs\/common-/,],
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    }
  },
})
