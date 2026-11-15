import { defineConfig } from 'tsup';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as {
  version: string;
};

export default defineConfig({
  // 版本号只在构建期注入：手写常量会在发版后漂移，运行时读 package.json 又会进产物
  define: {
    __CLI_VERSION__: JSON.stringify(pkg.version),
  },
  entry: {
    index: 'src/index.ts',
    create: 'src/create.ts',
    lyt: 'src/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: 'node18',
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    };
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: ['@lytjs/common-is', '@lytjs/common-env'],
});
