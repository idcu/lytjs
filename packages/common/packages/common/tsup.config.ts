import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
  external: [
    '@lytjs/common-env',
    '@lytjs/common-is',
    '@lytjs/common-string',
    '@lytjs/common-path',
    '@lytjs/common-events',
    '@lytjs/common-cache',
    '@lytjs/common-timing',
    '@lytjs/common-algorithm',
    '@lytjs/common-vnode',
    '@lytjs/common-error',
    '@lytjs/common-object',
    '@lytjs/common-scheduler',
  ],
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    }
  },
})
