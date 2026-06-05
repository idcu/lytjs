#!/usr/bin/env tsx
/**
 * 对比构建的包和发布的包
 */

import { join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const PUBLISHED_PACKAGES = [
  { name: '@lytjs/shared-types', path: 'packages/shared-types' },
  { name: '@lytjs/host-contract', path: 'packages/host-contract' },
  { name: '@lytjs/common-constants', path: 'packages/common/packages/constants' },
  { name: '@lytjs/common-is', path: 'packages/common/packages/is' },
  { name: '@lytjs/common-security', path: 'packages/common/packages/security' },
  { name: '@lytjs/common-string', path: 'packages/common/packages/string' },
  { name: '@lytjs/common-path', path: 'packages/common/packages/path' },
  { name: '@lytjs/common-object', path: 'packages/common/packages/object' },
  { name: '@lytjs/common-error', path: 'packages/common/packages/error' },
  { name: '@lytjs/common-warn', path: 'packages/common/packages/warn' },
  { name: '@lytjs/common-events', path: 'packages/common/packages/events' },
  { name: '@lytjs/common-cache', path: 'packages/common/packages/cache' },
  { name: '@lytjs/common-timing', path: 'packages/common/packages/timing' },
  { name: '@lytjs/common-algorithm', path: 'packages/common/packages/algorithm' },
  { name: '@lytjs/common-vnode', path: 'packages/common/packages/vnode' },
  { name: '@lytjs/common-scheduler', path: 'packages/common/packages/scheduler' },
  { name: '@lytjs/common-dom', path: 'packages/common/packages/dom' },
  { name: '@lytjs/common-query', path: 'packages/common/packages/query' },
  { name: '@lytjs/common-dom-helpers', path: 'packages/common/packages/dom-helpers' },
  { name: '@lytjs/common-a11y', path: 'packages/common/packages/a11y' },
  { name: '@lytjs/common-keyboard', path: 'packages/common/packages/keyboard' },
  { name: '@lytjs/common-storage', path: 'packages/common/packages/storage' },
  { name: '@lytjs/common-validate', path: 'packages/common/packages/validate' },
  { name: '@lytjs/common-http', path: 'packages/common/packages/http' },
  { name: '@lytjs/common-raf', path: 'packages/common/packages/raf' },
  { name: '@lytjs/common-render-queue', path: 'packages/common/packages/render-queue' },
  { name: '@lytjs/common-event-normalizer', path: 'packages/common/packages/event-normalizer' },
  { name: '@lytjs/common-node-cache', path: 'packages/common/packages/node-cache' },
  { name: '@lytjs/common-async-scheduler', path: 'packages/common/packages/async-scheduler' },
  { name: '@lytjs/common-transition-engine', path: 'packages/common/packages/transition-engine' },
  { name: '@lytjs/common-performance', path: 'packages/common/packages/performance' },
  { name: '@lytjs/common-assertions', path: 'packages/common/packages/assertions' },
  { name: '@lytjs/common-memory', path: 'packages/common/packages/memory' },
  { name: '@lytjs/common-rate-limit', path: 'packages/common/packages/rate-limit' },
  { name: '@lytjs/common-env', path: 'packages/common/packages/env' },
  { name: '@lytjs/common', path: 'packages/common/packages/common' },
  { name: '@lytjs/reactivity', path: 'packages/reactivity' },
  { name: '@lytjs/vdom', path: 'packages/vdom' },
  { name: '@lytjs/dom-runtime', path: 'packages/dom-runtime' },
  { name: '@lytjs/compiler', path: 'packages/compiler' },
  { name: '@lytjs/renderer', path: 'packages/renderer' },
  { name: '@lytjs/adapter-web', path: 'packages/adapter-web' },
  { name: '@lytjs/dom', path: 'packages/dom' },
  { name: '@lytjs/web', path: 'packages/web' },
  { name: '@lytjs/component', path: 'packages/component' },
  { name: '@lytjs/core', path: 'packages/core' },
  { name: '@lytjs/core-signal', path: 'packages/core-signal' },
  { name: '@lytjs/core-vnode', path: 'packages/core-vnode' },
  { name: '@lytjs/store', path: 'packages/ecosystem/packages/store' },
  { name: '@lytjs/ui', path: 'packages/ecosystem/packages/ui' },
  { name: '@lytjs/devtools', path: 'packages/ecosystem/packages/devtools' },
  { name: '@lytjs/compat', path: 'packages/ecosystem/packages/compat' },
  { name: '@lytjs/platform-adapter', path: 'packages/ecosystem/packages/platform-adapter' },
  { name: '@lytjs/bundler', path: 'packages/ecosystem/packages/bundler' },
  { name: '@lytjs/hmr', path: 'packages/ecosystem/packages/ssr-kit/packages/hmr' },
  { name: '@lytjs/ssr', path: 'packages/ecosystem/packages/ssr-kit/packages/ssr' },
  { name: '@lytjs/router', path: 'packages/ecosystem/packages/web-framework/packages/router' },
  { name: '@lytjs/router-fs', path: 'packages/ecosystem/packages/web-framework/packages/router-fs' },
  { name: '@lytjs/api', path: 'packages/ecosystem/packages/web-framework/packages/api' },
  { name: '@lytjs/runtime-edge', path: 'packages/ecosystem/packages/runtime-edge' },
  { name: '@lytjs/cache', path: 'packages/ecosystem/packages/ssr-kit/packages/cache' },
  { name: '@lytjs/cache-isr', path: 'packages/ecosystem/packages/ssr-kit/packages/cache-isr' },
  { name: '@lytjs/html-renderer', path: 'packages/ecosystem/packages/ssr-kit/packages/html-renderer' },
  { name: '@lytjs/ssg', path: 'packages/ecosystem/packages/ssr-kit/packages/ssg' },
  { name: '@lytjs/http-server', path: 'packages/ecosystem/packages/web-framework/packages/http-server' },
  { name: '@lytjs/metadata', path: 'packages/ecosystem/packages/web-framework/packages/metadata' },
  { name: '@lytjs/middleware', path: 'packages/ecosystem/packages/web-framework/packages/middleware' },
  { name: '@lytjs/middleware-cors', path: 'packages/ecosystem/packages/web-framework/packages/middleware-cors' },
  { name: '@lytjs/middleware-auth', path: 'packages/ecosystem/packages/web-framework/packages/middleware-auth' },
  { name: '@lytjs/middleware-rate-limit', path: 'packages/ecosystem/packages/web-framework/packages/middleware-rate-limit' },
  { name: '@lytjs/plugin-vite', path: 'packages/plugins/packages/plugin-vite' },
  { name: '@lytjs/plugin-theme', path: 'packages/plugins/packages/plugin-theme' },
  { name: '@lytjs/plugin-logger', path: 'packages/plugins/packages/plugin-logger' },
  { name: '@lytjs/plugin-auth', path: 'packages/plugins/packages/plugin-auth' },
  { name: '@lytjs/plugin-storage', path: 'packages/plugins/packages/plugin-storage' },
  { name: '@lytjs/plugin-i18n', path: 'packages/plugins/packages/plugin-i18n' },
  { name: '@lytjs/plugin-validation', path: 'packages/plugins/packages/plugin-validation' },
  { name: '@lytjs/plugin-data', path: 'packages/plugins/packages/plugin-data' },
  { name: '@lytjs/plugin-data-fetch', path: 'packages/plugins/packages/plugin-data-fetch' },
  { name: '@lytjs/plugin-chart', path: 'packages/plugins/packages/plugin-chart' },
  { name: '@lytjs/plugin-animation', path: 'packages/plugins/packages/plugin-animation' },
  { name: '@lytjs/plugin-testing', path: 'packages/plugins/packages/plugin-testing' },
  { name: '@lytjs/plugin-form', path: 'packages/plugins/packages/plugin-form' },
  { name: '@lytjs/test-utils', path: 'packages/tools/packages/test-utils' },
  { name: '@lytjs/cli', path: 'packages/tools/packages/cli' },
  { name: '@lytjs/devtools-extension', path: 'packages/tools/packages/devtools' },
];

function findPackageJson(dir: string, results: string[] = []) {
  const items = readdirSync(dir);
  for (const item of items) {
    if (item.startsWith('.') || item === '_templates') continue;
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      findPackageJson(fullPath, results);
    } else if (item === 'package.json') {
      results.push(fullPath);
    }
  }
  return results;
}

async function main() {
  console.log('📦 对比构建的包和发布的包\n');
  console.log('='.repeat(80));

  // 1. 获取所有存在的 package.json
  const packageFiles = findPackageJson(join(ROOT, 'packages'));
  console.log(`\n📁 找到 ${packageFiles.length} 个 package.json 文件`);

  // 2. 提取包名
  const allPackageNames: string[] = [];
  for (const pkgFile of packageFiles) {
    try {
      const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
      if (pkg.name && !pkg.private) {
        allPackageNames.push(pkg.name);
      }
    } catch (e) {
      console.log(`⚠️  无法读取 ${pkgFile}: ${e}`);
    }
  }

  console.log(`\n✅ 找到 ${allPackageNames.length} 个可发布的包`);

  // 3. 对比
  const publishedNames = PUBLISHED_PACKAGES.map(p => p.name);
  const notInPublished = allPackageNames.filter(name => !publishedNames.includes(name));
  const extraInPublished = publishedNames.filter(name => !allPackageNames.includes(name));

  console.log(`\n📊 对比结果:`);
  console.log(`  - 发布脚本中有 ${publishedNames.length} 个包`);
  console.log(`  - 实际存在 ${allPackageNames.length} 个包`);
  
  if (notInPublished.length > 0) {
    console.log(`\n❌ 实际存在但不在发布列表中的包 (${notInPublished.length}个):`);
    notInPublished.forEach(name => console.log(`  - ${name}`));
  }
  
  if (extraInPublished.length > 0) {
    console.log(`\n❌ 在发布列表中但不存在的包 (${extraInPublished.length}个):`);
    extraInPublished.forEach(name => console.log(`  - ${name}`));
  }

  if (notInPublished.length === 0 && extraInPublished.length === 0) {
    console.log(`\n✅ 所有包匹配！`);
  }
  
  console.log('\n' + '='.repeat(80));
}

main().catch(console.error);
