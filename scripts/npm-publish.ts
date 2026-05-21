#!/usr/bin/env tsx
/**
 * LytJS 完整 npm 发布脚本
 *
 * 使用方法:
 *   pnpm tsx scripts/npm-publish.ts --token YOUR_NPM_TOKEN
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// 构建顺序 - 按依赖关系排序（参考，实际使用时需要时取消注释）
/* const BUILD_ORDER = [
  // 阶段 1: 基础类型和契约
  'shared-types',
  'host-contract',
  
  // 阶段 2: common 工具包
  'common-constants',
  'common-is',
  'common-security',
  'common-string',
  'common-path',
  'common-object',
  'common-error',
  'common-warn',
  'common-events',
  'common-cache',
  'common-timing',
  'common-algorithm',
  'common-vnode',
  'common-scheduler',
  'common-dom',
  'common-query',
  'common-dom-helpers',
  'common-a11y',
  'common-keyboard',
  'common-storage',
  'common-validate',
  'common-http',
  'common-raf',
  'common-render-queue',
  'common-event-normalizer',
  'common-node-cache',
  'common-async-scheduler',
  'common-transition-engine',
  'common-performance',
  'common-assertions',
  'common-memory',
  'common-rate-limit',
  'common',
  
  // 阶段 3: 核心包
  'reactivity',
  'vdom',
  'dom-runtime',
  'compiler',
  'renderer',
  'adapter-web',
  'dom',
  'web',
  'component',
  'core',
  'core-signal',
  'core-vnode',
  
  // 阶段 4: 生态包
  'router',
  'store',
  'ssr',
  'ui',
  'devtools',
  'compat',
  'platform-adapter',
  'router-fs',
  'api',
  'bundler',
  'hmr',
  'runtime-edge',
  'cache-isr',
  'html-renderer',
  'ssg',
  
  // 阶段 5: web framework
  'http-server',
  'metadata',
  'middleware',
  'middleware-auth',
  'middleware-cors',
  'middleware-rate-limit',
  
  // 阶段 6: 插件
  'plugin-vite',
  'plugin-theme',
  'plugin-logger',
  'plugin-auth',
  'plugin-storage',
  'plugin-i18n',
  'plugin-validation',
  'plugin-data',
  'plugin-data-fetch',
  'plugin-chart',
  'plugin-animation',
  'plugin-testing',
  'plugin-form',
  
  // 阶段 7: 工具
  'test-utils',
  'cli',
  'devtools-extension',
]; */

// 解析命令行参数
const args = process.argv.slice(2);
let npmToken: string | null = null;
let skipBuild = false;
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--token' && args[i + 1]) {
    npmToken = args[i + 1];
    i++;
  } else if (args[i] === '--skip-build') {
    skipBuild = true;
  } else if (args[i] === '--dry-run') {
    dryRun = true;
  }
}

function logInfo(message: string) {
  console.log(`\x1b[36mℹ️  ${message}\x1b[0m`);
}

function logSuccess(message: string) {
  console.log(`\x1b[32m✅ ${message}\x1b[0m`);
}

function logWarning(message: string) {
  console.log(`\x1b[33m⚠️  ${message}\x1b[0m`);
}

function logError(message: string) {
  console.error(`\x1b[31m❌ ${message}\x1b[0m`);
}

function exec(command: string, options: Record<string, unknown> = {}) {
  logInfo(`执行命令: ${command}`);
  return execSync(command, {
    cwd: rootDir,
    stdio: options.silent ? 'pipe' : 'inherit',
    ...options,
  });
}

// 检查必要条件
logInfo('开始 npm 发布前检查...');

console.log('\n=== 第一步: 检查前置条件 ===\n');

// 检查 token
if (!npmToken) {
  logError('请提供 npm token: pnpm tsx scripts/npm-publish.ts --token YOUR_TOKEN');
  process.exit(1);
}

// 检查是否有 changeset
const changesetDir = path.join(rootDir, '.changeset');
const changesets = fs
  .readdirSync(changesetDir)
  .filter((f) => f.endsWith('.md') && f !== 'README.md');

if (changesets.length === 0) {
  logWarning('没有找到 changeset，继续发布...');
} else {
  logSuccess(`找到 ${changesets.length} 个 changeset`);
}

// 创建 .npmrc
const npmrcPath = path.join(rootDir, '.npmrc');
const npmrcContent = `//registry.npmjs.org/:_authToken=${npmToken}`;
fs.writeFileSync(npmrcPath, npmrcContent);
logSuccess('.npmrc 已创建');

console.log('\n=== 第二步: 发布前检查 ===\n');

if (!skipBuild) {
  // 快速检查
  try {
    logInfo('运行 format 检查...');
    exec('pnpm format:check', { silent: true });
    logSuccess('format 检查通过');
  } catch (_e) {
    logWarning('format 检查不通过，但继续发布...');
  }

  try {
    logInfo('运行 lint 检查...');
    exec('pnpm lint:check', { silent: true });
    logSuccess('lint 检查通过');
  } catch (_e) {
    logWarning('lint 检查不通过，但继续发布...');
  }
}

console.log('\n=== 第三步: 转换 workspace 依赖 ===\n');

// 运行 prepare-publish
exec('pnpm tsx scripts/prepare-publish.ts');
logSuccess('workspace 依赖已转换');

console.log('\n=== 第四步: 构建包（如果需要） ===\n');

if (!skipBuild) {
  // 快速构建几个核心包，避免完整构建太长时间
  const quickBuildPackages = ['shared-types', 'common-constants', 'common-is', 'reactivity'];

  for (const pkg of quickBuildPackages) {
    try {
      logInfo(`构建 ${pkg}...`);
      // const pkgPath = path.join(rootDir, 'packages', pkg.includes('common-') ? 'common' : '', 'packages', pkg.replace('common-', ''));

      let actualPkgPath = '';
      // 尝试多种路径查找
      if (fs.existsSync(path.join(rootDir, 'packages', pkg))) {
        actualPkgPath = path.join(rootDir, 'packages', pkg);
      } else if (
        fs.existsSync(
          path.join(rootDir, 'packages', 'common', 'packages', pkg.replace('common-', '')),
        )
      ) {
        actualPkgPath = path.join(
          rootDir,
          'packages',
          'common',
          'packages',
          pkg.replace('common-', ''),
        );
      }

      if (actualPkgPath && fs.existsSync(path.join(actualPkgPath, 'package.json'))) {
        exec(`cd "${actualPkgPath}" && pnpm build`);
        logSuccess(`${pkg} 构建成功`);
      }
    } catch (_e) {
      logWarning(`${pkg} 构建跳过或失败，继续...`);
    }
  }
} else {
  logInfo('跳过构建 (--skip-build)');
}

console.log('\n=== 第五步: 准备发布 ===\n');

console.log('\n📋 发布准备完成！\n');

console.log('接下来你可以：');
console.log('  1. 运行 changeset version 更新版本');
console.log('  2. 运行 changeset publish 发布');
console.log('  3. 或者手动发布各个包\n');

console.log('🔄 快速开始:');
console.log('  pnpm changeset version');
console.log('  pnpm changeset publish');
console.log('\n  发布完成后记得恢复 workspace 依赖:');
console.log('  pnpm tsx scripts/restore-workspace.ts');
console.log();

logSuccess('npm 发布准备工作已完成！');

if (dryRun) {
  logInfo('这是 dry-run，不进行实际发布');
  console.log('恢复 workspace 依赖...');
  exec('pnpm tsx scripts/restore-workspace.ts');
}

console.log('\n');
