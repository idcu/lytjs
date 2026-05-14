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
    environment: 'node',
  },
  resolve: {
    alias: [
      {
        find: /^@lytjs\/core$/,
        replacement: path.resolve(__dirname, '../packages/core/dist/index.mjs'),
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
    ],
  },
});
