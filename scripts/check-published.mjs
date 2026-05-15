#!/usr/bin/env node

import { execSync } from 'child_process';

const packages = [
  'shared-types',
  'common-constants',
  'common-is',
  'common-object',
  'common-string',
  'common-path',
  'common-error',
  'common-warn',
  'common-events',
  'common-cache',
  'common-timing',
  'common-scheduler',
  'common-algorithm',
  'common-vnode',
  'common-env',
  'common-dom',
  'common-dom-helpers',
  'common-query',
  'common-raf',
  'common-security',
  'common-storage',
  'common-validate',
  'common-http',
  'common-keyboard',
  'common-a11y',
  'common-performance',
  'common-assertions',
  'common-async-scheduler',
  'common-event-normalizer',
  'common-node-cache',
  'common-render-queue',
  'common-transition-engine',
  'common',
  'host-contract',
  'reactivity',
  'vdom',
  'dom-runtime',
  'compiler',
  'component',
  'renderer',
  'adapter-web',
  'core',
  'core-signal',
  'core-vnode',
  'router',
  'store',
  'ssr',
  'compat',
  'devtools',
  'platform-adapter',
  'ui',
  'plugin-vite',
  'plugin-theme',
  'plugin-logger',
  'plugin-auth',
  'plugin-storage',
  'plugin-i18n',
  'plugin-chart',
  'cli',
  'devtools-extension',
  'test-utils',
];

console.log('检查已发布的包...\n');

const published = [];
const notPublished = [];

for (const pkg of packages) {
  try {
    const version = execSync(`npm view @lytjs/${pkg} version 2>/dev/null`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    published.push({ name: pkg, version });
  } catch {
    notPublished.push(pkg);
  }
}

console.log(`✅ 已发布 (${published.length}):`);
published.forEach(p => console.log(`   @lytjs/${p.name}: ${p.version}`));

console.log(`\n❌ 未发布 (${notPublished.length}):`);
notPublished.forEach(p => console.log(`   @lytjs/${p}`));
