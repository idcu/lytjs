#!/usr/bin/env tsx
/**
 * 简单的逐个包发布脚本
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPackageJsonFiles } from './shared.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const isDryRun = process.argv.includes('--dry-run');

// 设置 npm token（从 .npmrc_for_publish）
const npmrcPublish = readFileSync(join(ROOT, '.npmrc_for_publish'), 'utf-8');
const tokenMatch = npmrcPublish.match(/authToken=(.+)/);
if (tokenMatch) {
  process.env.NPM_TOKEN = tokenMatch[1].trim();
}

// 按正确的依赖顺序排序的包列表（先发布基础包）
const BUILD_ORDER = [
  'shared-types',
  'host-contract',
  'common-constants',
  'common-is',
  'common-string',
  'common-object',
  'common-error',
  'common-env',
  'common-events',
  'common-async-scheduler',
  'common-render-queue',
  'common-cache',
  'common-path',
  'common-dom',
  'common-dom-helpers',
  'common-timing',
  'common-performance',
  'common-algorithm',
  'common-transition-engine',
  'common-http',
  'common-query',
  'common-validate',
  'common-vnode',
  'common-scheduler',
  'common-assertions',
  'common-memory',
  'common-node-cache',
  'common-event-normalizer',
  'common-warn',
  'common-keyboard',
  'common-a11y',
  'common-storage',
  'common-raf',
  'common-security',
  'common-rate-limit',
  'common',
  'reactivity',
  'vdom',
  'component',
  'compiler',
  'dom-runtime',
  'adapter-web',
  'renderer',
  'core',
  'core-signal',
  'core-vnode',
  'dom',
  'platform-adapter',
  'ui',
  'router',
  'store',
  'ssr',
  'ssg',
  'cache-isr',
  'html-renderer',
  'hmr',
  'api',
  'bundler',
  'compat',
  'devtools',
  'devtools-extension',
  'test-utils',
  'metadata',
  'middleware',
  'middleware-auth',
  'middleware-cors',
  'middleware-rate-limit',
  'http-server',
  'plugin-vite',
  'plugin-animation',
  'plugin-auth',
  'plugin-chart',
  'plugin-data-fetch',
  'plugin-data',
  'plugin-form',
  'plugin-i18n',
  'plugin-logger',
  'plugin-storage',
  'plugin-theme',
  'plugin-testing',
  'plugin-validation',
  'cli',
  'web',
];

const pkgFiles = findPackageJsonFiles(join(ROOT, 'packages'));
const pkgs = new Map();

for (const pkgFile of pkgFiles) {
  const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
  pkgs.set(pkg.name, {
    dir: dirname(pkgFile),
    pkg,
  });
}

console.log(`📦 开始${isDryRun ? ' 模拟(dry-run) ' : ''}逐个发布包...\n`);

const published: string[] = [];
const skipped: string[] = [];
const failed: string[] = [];

for (const pkgName of BUILD_ORDER) {
  const fullName = `@lytjs/${pkgName}`;
  const info = pkgs.get(fullName);

  if (!info) {
    console.log(`⏭️  ${fullName} 未找到，跳过`);
    continue;
  }

  // 检查是否有 dist 文件夹
  const hasDist = existsSync(join(info.dir, 'dist'));
  if (!hasDist) {
    console.log(`⏭️  ${fullName} 无 dist 文件夹，跳过`);
    skipped.push(fullName);
    continue;
  }

  // 检查是否已经是 6.6.0
  if (info.pkg.version !== '6.6.0') {
    console.log(`⏭️  ${fullName} 版本为 ${info.pkg.version}，不是 6.6.0，跳过`);
    skipped.push(fullName);
    continue;
  }

  console.log(`🚀 ${isDryRun ? '[DRY-RUN] ' : ''}正在发布 ${fullName}@${info.pkg.version}...`);

  if (isDryRun) {
    console.log(`✅ ${fullName} (dry-run) 成功！\n`);
    published.push(fullName);
    continue;
  }

  try {
    // 在包目录运行 npm publish
    execSync('npm publish --access public', {
      cwd: info.dir,
      env: {
        ...process.env,
        npm_config_registry: 'https://registry.npmjs.org/',
      },
      stdio: 'inherit',
    });
    console.log(`✅ ${fullName} 发布成功！\n`);
    published.push(fullName);
  } catch {
    console.log(`❌ ${fullName} 发布失败\n`);
    failed.push(fullName);
  }
}

console.log('\n📊 发布完成！');
console.log(`✅ 成功: ${published.length} 个`);
console.log(`⏭️ 跳过: ${skipped.length} 个`);
console.log(`❌ 失败: ${failed.length} 个`);
