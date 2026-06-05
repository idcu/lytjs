import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['src/**/*.bench.ts'],
    benchmark: {
      include: ['src/**/*.bench.ts'],
      reporters: ['default'],
    },
    globals: true,
    environment: 'jsdom',
    includeSource: ['src/**/*.{js,ts}'],
    pool: 'forks',
    env: {
      NODE_ENV: 'development',
      __DEV__: 'true',
    },
  },
  define: {
    __DEV__: true,
  },
  resolve: {
    alias: [
      {
        find: /^@lytjs\/core$/,
        replacement: path.resolve(__dirname, '../packages/core/dist/index.mjs'),
      },
      {
        find: /^@lytjs\/core-signal$/,
        replacement: path.resolve(__dirname, '../packages/core-signal/dist/index.mjs'),
      },
      {
        find: /^@lytjs\/core-vnode$/,
        replacement: path.resolve(__dirname, '../packages/core-vnode/dist/index.mjs'),
      },
      {
        find: /^@lytjs\/component$/,
        replacement: path.resolve(__dirname, '../packages/component/dist/index.mjs'),
      },
      {
        find: /^@lytjs\/reactivity$/,
        replacement: path.resolve(__dirname, '../packages/reactivity/dist/index.mjs'),
      },
      {
        find: /^@lytjs\/reactivity\/scope$/,
        replacement: path.resolve(__dirname, '../packages/reactivity/dist/scope.mjs'),
      },
      {
        find: /^@lytjs\/reactivity\/signal$/,
        replacement: path.resolve(__dirname, '../packages/reactivity/dist/signal.mjs'),
      },
      {
        find: /^@lytjs\/reactivity\/signal-component$/,
        replacement: path.resolve(__dirname, '../packages/reactivity/dist/signal-component.mjs'),
      },
      {
        find: /^@lytjs\/reactivity\/async$/,
        replacement: path.resolve(__dirname, '../packages/reactivity/dist/async.mjs'),
      },
      {
        find: /^@lytjs\/renderer$/,
        replacement: path.resolve(__dirname, '../packages/renderer/dist/index.mjs'),
      },
      {
        find: /^@lytjs\/vdom$/,
        replacement: path.resolve(__dirname, '../packages/vdom/dist/index.mjs'),
      },
      {
        find: /^@lytjs\/dom-runtime$/,
        replacement: path.resolve(__dirname, '../packages/dom-runtime/dist/index.mjs'),
      },
    ],
  },
});
