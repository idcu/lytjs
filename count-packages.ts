#!/usr/bin/env tsx

import { globSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname);

const allPackages: string[] = [];

// Common packages
const commonPackages = globSync('packages/common/packages/*/package.json', { cwd: ROOT });
allPackages.push(...commonPackages);

// Core packages
const corePackages = [
  'packages/shared-types/package.json',
  'packages/host-contract/package.json',
  'packages/reactivity/package.json',
  'packages/dom-runtime/package.json',
  'packages/vdom/package.json',
  'packages/compiler/package.json',
  'packages/renderer/package.json',
  'packages/adapter-web/package.json',
  'packages/component/package.json',
  'packages/core/package.json',
  'packages/core-vnode/package.json',
  'packages/core-signal/package.json',
  'packages/dom/package.json',
  'packages/web/package.json',
];
allPackages.push(...corePackages);

// Ecosystem single packages
const ecosystemSinglePackages = [
  'packages/ecosystem/packages/ui/package.json',
  'packages/ecosystem/packages/store/package.json',
  'packages/ecosystem/packages/devtools/package.json',
  'packages/ecosystem/packages/bundler/package.json',
  'packages/ecosystem/packages/runtime-edge/package.json',
  'packages/ecosystem/packages/compat/package.json',
  'packages/ecosystem/packages/platform-adapter/package.json',
];
allPackages.push(...ecosystemSinglePackages);

// Ecosystem packages
const ecosystemPackages = globSync('packages/ecosystem/packages/*/package.json', { cwd: ROOT });
allPackages.push(...ecosystemPackages);

// Web-framework packages
const webFrameworkPackages = globSync('packages/ecosystem/packages/web-framework/packages/*/package.json', { cwd: ROOT });
allPackages.push(...webFrameworkPackages);

// SSR-kit packages
const ssrKitPackages = globSync('packages/ecosystem/packages/ssr-kit/packages/*/package.json', { cwd: ROOT });
allPackages.push(...ssrKitPackages);

// Plugins packages
const pluginsPackages = globSync('packages/plugins/packages/*/package.json', { cwd: ROOT });
allPackages.push(...pluginsPackages);

// Tools packages
const toolsPackages = globSync('packages/tools/packages/*/package.json', { cwd: ROOT });
allPackages.push(...toolsPackages);

// 去重
const uniquePackages = [...new Set(allPackages)];

console.log(`📦 LytJS 包数量统计`);
console.log('='.repeat(60));
console.log(`\nCommon 包: ${commonPackages.length} 个`);
console.log(`Core 包: ${corePackages.length} 个`);
console.log(`Ecosystem 单个包: ${ecosystemSinglePackages.length} 个`);
console.log(`Ecosystem 包: ${ecosystemPackages.length} 个`);
console.log(`Web-framework 子包: ${webFrameworkPackages.length} 个`);
console.log(`SSR-kit 子包: ${ssrKitPackages.length} 个`);
console.log(`Plugins 包: ${pluginsPackages.length} 个`);
console.log(`Tools 包: ${toolsPackages.length} 个`);
console.log('\n' + '='.repeat(60));
console.log(`总计 (去重前): ${allPackages.length} 个`);
console.log(`总计 (去重后): ${uniquePackages.length} 个`);
console.log('='.repeat(60));

console.log('\n📝 所有包列表:');
console.log('-'.repeat(60));
const sortedPackages = uniquePackages.sort();
sortedPackages.forEach((pkg, index) => {
  const relPath = relative(ROOT, pkg);
  console.log(`${String(index + 1).padStart(3, ' ')}. ${relPath}`);
});
