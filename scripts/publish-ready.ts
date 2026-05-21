#!/usr/bin/env tsx
/**
 * 简单的逐个包发布脚本 - 只发布构建好的包
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const isDryRun = process.argv.includes('--dry-run');

// 设置 npm token（从 .npmrc_for_publish）
const npmrcPublish = readFileSync(join(ROOT, '.npmrc_for_publish'), 'utf-8');
const tokenMatch = npmrcPublish.match(/authToken=(.+)/);
let npmToken = '';
if (tokenMatch) {
  npmToken = tokenMatch[1].trim();
}

// 从 check-build.ts 里知道成功的包列表
const successPackages = [
  '@lytjs/shared-types',
  '@lytjs/host-contract',
  '@lytjs/common-constants',
  '@lytjs/common-is',
  '@lytjs/common-security',
  '@lytjs/common-string',
  '@lytjs/common-path',
  '@lytjs/common-object',
  '@lytjs/common-error',
  '@lytjs/common-warn',
  '@lytjs/common-events',
  '@lytjs/common-cache',
  '@lytjs/common-timing',
  '@lytjs/common-algorithm',
  '@lytjs/common-vnode',
  '@lytjs/common-scheduler',
  '@lytjs/common-dom',
  '@lytjs/common-query',
  '@lytjs/common-dom-helpers',
  '@lytjs/common-a11y',
  '@lytjs/common-keyboard',
  '@lytjs/common-storage',
  '@lytjs/common-validate',
  '@lytjs/common-http',
  '@lytjs/common-raf',
  '@lytjs/common-render-queue',
  '@lytjs/common-event-normalizer',
  '@lytjs/common-node-cache',
  '@lytjs/common-async-scheduler',
  '@lytjs/common-transition-engine',
  '@lytjs/common-performance',
  '@lytjs/common-assertions',
  '@lytjs/common-memory',
  '@lytjs/common-rate-limit',
  '@lytjs/common',
  '@lytjs/reactivity',
  '@lytjs/vdom',
  '@lytjs/dom-runtime',
  '@lytjs/compiler',
  '@lytjs/renderer',
  '@lytjs/adapter-web',
  '@lytjs/dom',
  '@lytjs/web',
  '@lytjs/component',
  '@lytjs/core',
  '@lytjs/core-signal',
  '@lytjs/core-vnode',
  '@lytjs/platform-adapter',
  '@lytjs/ui',
  '@lytjs/store',
  '@lytjs/ssg',
  '@lytjs/cache-isr',
  '@lytjs/html-renderer',
  '@lytjs/hmr',
  '@lytjs/api',
  '@lytjs/bundler',
  '@lytjs/compat',
  '@lytjs/devtools',
  '@lytjs/devtools-extension',
  '@lytjs/test-utils',
  '@lytjs/metadata',
  '@lytjs/middleware',
  '@lytjs/middleware-auth',
  '@lytjs/middleware-cors',
  '@lytjs/middleware-rate-limit',
  '@lytjs/http-server',
  '@lytjs/plugin-vite',
  '@lytjs/plugin-animation',
  '@lytjs/plugin-auth',
  '@lytjs/plugin-chart',
  '@lytjs/plugin-data-fetch',
  '@lytjs/plugin-data',
  '@lytjs/plugin-form',
  '@lytjs/plugin-i18n',
  '@lytjs/plugin-logger',
  '@lytjs/plugin-storage',
  '@lytjs/plugin-theme',
  '@lytjs/plugin-testing',
  '@lytjs/plugin-validation',
  '@lytjs/cli',
];

// 先找到所有包的路径
function findAllPackages() {
  const packages = new Map();

  // 搜索 packages 目录
  function scanDir(dir: string) {
    // 简单实现，只找有 package.json 的目录
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = join(dir, entry.name);
        const pkgJsonPath = join(fullPath, 'package.json');
        if (existsSync(pkgJsonPath)) {
          const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
          if (pkg.name && !pkg.private) {
            packages.set(pkg.name, {
              dir: fullPath,
              pkg,
            });
          }
        }
        // 递归搜索（排除 node_modules, dist
        if (entry.name !== 'node_modules' && entry.name !== 'dist') {
          scanDir(fullPath);
        }
      }
    }
  }

  scanDir(join(ROOT, 'packages'));
  return packages;
}

const allPackages = findAllPackages();

console.log(`📦 开始${isDryRun ? ' 模拟(dry-run) ' : ''}逐个发布包...\n`);

const published: string[] = [];
const skipped: string[] = [];
const failed: string[] = [];

// 按依赖顺序发布
for (const pkgName of successPackages) {
  const info = allPackages.get(pkgName);
  if (!info) {
    console.log(`⏭️  ${pkgName} 未找到，跳过`);
    skipped.push(pkgName);
    continue;
  }

  // 检查是否有 dist 文件夹
  const hasDist = existsSync(join(info.dir, 'dist'));
  if (!hasDist) {
    console.log(`⏭️  ${pkgName} 无 dist 文件夹，跳过`);
    skipped.push(pkgName);
    continue;
  }

  // 检查版本
  if (info.pkg.version !== '6.6.0') {
    console.log(`⏭️  ${pkgName} 版本为 ${info.pkg.version}，不是 6.6.0，跳过`);
    skipped.push(pkgName);
    continue;
  }

  console.log(`🚀 ${isDryRun ? '[DRY-RUN] ' : ''}正在发布 ${pkgName}@${info.pkg.version}...`);

  if (isDryRun) {
    console.log(`✅ ${pkgName} (dry-run) 成功！\n`);
    published.push(pkgName);
    continue;
  }

  try {
    // 在包目录运行 npm publish
    execSync(`npm publish --access public --//registry.npmjs.org/:_authToken=${npmToken}`, {
      cwd: info.dir,
      stdio: 'inherit',
    });
    console.log(`✅ ${pkgName} 发布成功！\n`);
    published.push(pkgName);
  } catch {
    console.log(`❌ ${pkgName} 发布失败\n`);
    failed.push(pkgName);
  }
}

console.log('\n📊 发布完成！');
console.log(`✅ 成功: ${published.length} 个`);
console.log(`⏭️ 跳过: ${skipped.length} 个`);
console.log(`❌ 失败: ${failed.length} 个`);
