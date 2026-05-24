#!/usr/bin/env tsx
/**
 * 智能构建脚本 - 增强版
 *
 * 功能：
 * 1. 使用预定义的正确构建顺序
 * 2. 支持增量构建（跳过已构建的包）
 * 3. 提供详细的构建进度和错误反馈
 * 4. 遇到错误时可以选择继续或停止
 *
 * 用法:
 *   tsx scripts/smart-build.ts                    # 构建所有包
 *   tsx scripts/smart-build.ts --continue-on-error  # 遇到错误继续构建
 *   tsx scripts/smart-build.ts --skip-built         # 跳过已构建的包
 *   tsx scripts/smart-build.ts --filter common      # 只构建名称包含 common 的包
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// 命令行参数解析
const args = process.argv.slice(2);
const CONTINUE_ON_ERROR = args.includes('--continue-on-error');
const SKIP_BUILT = args.includes('--skip-built');
const FILTER = args.find((a) => a.startsWith('--filter='))?.split('=')[1];

// 正确的构建顺序 - 按依赖关系严格排序
const BUILD_ORDER = [
  // 第 1 层: 基础包
  { name: '@lytjs/shared-types', path: 'packages/shared-types' },
  { name: '@lytjs/host-contract', path: 'packages/host-contract' },

  // 第 2 层: Common 工具包
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
  { name: '@lytjs/common', path: 'packages/common/packages/common' },

  // 第 3 层: 核心包
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

  // 第 4 层: 生态系统包
  { name: '@lytjs/router', path: 'packages/ecosystem/packages/router' },
  { name: '@lytjs/store', path: 'packages/ecosystem/packages/store' },
  { name: '@lytjs/ssr', path: 'packages/ecosystem/packages/ssr' },
  { name: '@lytjs/ui', path: 'packages/ecosystem/packages/ui' },
  { name: '@lytjs/devtools', path: 'packages/ecosystem/packages/devtools' },
  { name: '@lytjs/compat', path: 'packages/ecosystem/packages/compat' },
  { name: '@lytjs/platform-adapter', path: 'packages/ecosystem/packages/platform-adapter' },
  { name: '@lytjs/router-fs', path: 'packages/ecosystem/packages/router-fs' },
  { name: '@lytjs/api', path: 'packages/ecosystem/packages/api' },
  { name: '@lytjs/bundler', path: 'packages/ecosystem/packages/bundler' },
  { name: '@lytjs/hmr', path: 'packages/ecosystem/packages/hmr' },
  { name: '@lytjs/runtime-edge', path: 'packages/ecosystem/packages/runtime-edge' },

  // 第 4.5 层: SSR Kit
  { name: '@lytjs/cache-isr', path: 'packages/ecosystem/packages/ssr-kit/packages/cache-isr' },
  {
    name: '@lytjs/html-renderer',
    path: 'packages/ecosystem/packages/ssr-kit/packages/html-renderer',
  },
  { name: '@lytjs/ssg', path: 'packages/ecosystem/packages/ssr-kit/packages/ssg' },

  // 第 5 层: Web Framework 包
  {
    name: '@lytjs/web-framework-api',
    path: 'packages/ecosystem/packages/web-framework/packages/api',
  },
  {
    name: '@lytjs/web-framework-http-server',
    path: 'packages/ecosystem/packages/web-framework/packages/http-server',
  },
  {
    name: '@lytjs/web-framework-metadata',
    path: 'packages/ecosystem/packages/web-framework/packages/metadata',
  },
  {
    name: '@lytjs/web-framework-middleware',
    path: 'packages/ecosystem/packages/web-framework/packages/middleware',
  },
  {
    name: '@lytjs/web-framework-middleware-cors',
    path: 'packages/ecosystem/packages/web-framework/packages/middleware-cors',
  },
  {
    name: '@lytjs/web-framework-middleware-auth',
    path: 'packages/ecosystem/packages/web-framework/packages/middleware-auth',
  },
  {
    name: '@lytjs/web-framework-middleware-rate-limit',
    path: 'packages/ecosystem/packages/web-framework/packages/middleware-rate-limit',
  },
  {
    name: '@lytjs/web-framework-router',
    path: 'packages/ecosystem/packages/web-framework/packages/router',
  },
  {
    name: '@lytjs/web-framework-router-fs',
    path: 'packages/ecosystem/packages/web-framework/packages/router-fs',
  },

  // 第 6 层: 插件包
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

  // 第 7 层: 工具包
  { name: '@lytjs/test-utils', path: 'packages/tools/packages/test-utils' },
  { name: '@lytjs/cli', path: 'packages/tools/packages/cli' },
];

// 包信息接口
interface PackageInfo {
  name: string;
  path: string;
  hasBuildScript: boolean;
  isBuilt: boolean;
}

// 构建状态
interface BuildState {
  success: string[];
  failed: string[];
  skipped: string[];
}

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function colorText(color: string, text: string): string {
  return `${color}${text}${colors.reset}`;
}

function logInfo(message: string): void {
  console.log(colorText(colors.cyan, `ℹ️  ${message}`));
}

function logSuccess(message: string): void {
  console.log(colorText(colors.green, `✅ ${message}`));
}

function logWarning(message: string): void {
  console.log(colorText(colors.yellow, `⚠️  ${message}`));
}

function logError(message: string): void {
  console.error(colorText(colors.red, `❌ ${message}`));
}

function logSection(title: string): void {
  console.log(`\n${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

// 检查包信息
function getPackageInfo(pkg: { name: string; path: string }): PackageInfo {
  const pkgPath = join(ROOT, pkg.path);

  if (!existsSync(pkgPath)) {
    return { ...pkg, hasBuildScript: false, isBuilt: false };
  }

  const pkgJsonPath = join(pkgPath, 'package.json');
  let hasBuildScript = false;

  if (existsSync(pkgJsonPath)) {
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    hasBuildScript = !!pkgJson.scripts?.build;
  }

  const distPath = join(pkgPath, 'dist');
  const isBuilt = existsSync(distPath);

  return { ...pkg, hasBuildScript, isBuilt };
}

// 检查包是否需要构建
function shouldBuild(pkg: PackageInfo): boolean {
  // 检查过滤器
  if (FILTER && !pkg.name.includes(FILTER)) {
    return false;
  }

  // 检查是否有 build 脚本
  if (!pkg.hasBuildScript) {
    return false;
  }

  // 检查是否跳过已构建的包
  if (SKIP_BUILT && pkg.isBuilt) {
    return false;
  }

  return true;
}

// 构建单个包
function buildPackage(pkg: PackageInfo): boolean {
  const pkgPath = join(ROOT, pkg.path);
  const tsupPath = join(ROOT, 'node_modules', 'tsup', 'dist', 'cli-default.js');

  logInfo(`正在构建: ${colorText(colors.bold, pkg.name)}`);
  logInfo(`路径: ${pkg.path}`);

  try {
    // 使用根目录的 node_modules 运行 tsup，确保找到所有依赖
    execSync(`node ${tsupPath}`, {
      cwd: pkgPath,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    });

    logSuccess(`构建成功: ${pkg.name}`);
    return true;
  } catch (error) {
    logError(`构建失败: ${pkg.name}`);

    if (CONTINUE_ON_ERROR) {
      logWarning('继续构建下一个包...');
      return false;
    } else {
      throw error;
    }
  }
}

// 主函数
function main(): void {
  console.log(colorText(colors.bold, '\n🚀 LytJS 智能构建系统\n'));

  // 步骤 1: 准备构建列表
  logSection('步骤 1: 准备构建列表');
  const allPackages = BUILD_ORDER.map(getPackageInfo);
  logInfo(`共 ${allPackages.length} 个包`);

  // 步骤 2: 筛选需要构建的包
  logSection('步骤 2: 筛选构建目标');
  const packagesToBuild = allPackages.filter(shouldBuild);
  const packagesToSkip = allPackages.filter((p) => !shouldBuild(p));

  logInfo(`需要构建: ${packagesToBuild.length} 个包`);
  logInfo(`跳过: ${packagesToSkip.length} 个包`);

  if (packagesToSkip.length > 0) {
    console.log('\n跳过的包:');
    packagesToSkip.forEach((pkg) => {
      let reason = '';
      if (!pkg.hasBuildScript) reason = ' (无 build 脚本)';
      else if (SKIP_BUILT && pkg.isBuilt) reason = ' (已构建)';
      else if (FILTER && !pkg.name.includes(FILTER)) reason = ' (不匹配过滤器)';
      console.log(`  - ${pkg.name}${reason}`);
    });
  }

  if (packagesToBuild.length === 0) {
    logInfo('没有需要构建的包，退出');
    return;
  }

  // 步骤 3: 执行构建
  logSection('步骤 3: 开始构建');

  const state: BuildState = {
    success: [],
    failed: [],
    skipped: [],
  };

  for (let i = 0; i < packagesToBuild.length; i++) {
    const pkg = packagesToBuild[i];
    const progress = `[${i + 1}/${packagesToBuild.length}]`;

    console.log(`\n${colorText(colors.bold, progress)}`);

    try {
      const success = buildPackage(pkg);
      if (success) {
        state.success.push(pkg.name);
      } else {
        state.failed.push(pkg.name);
      }
    } catch (_error) {
      state.failed.push(pkg.name);
      if (!CONTINUE_ON_ERROR) {
        logError('构建过程遇到错误，停止构建');
        break;
      }
    }
  }

  // 步骤 4: 总结
  logSection('构建总结');

  console.log(`📊 统计:`);
  console.log(`  ${colorText(colors.green, '✅ 成功:')} ${state.success.length} 个包`);
  console.log(`  ${colorText(colors.red, '❌ 失败:')} ${state.failed.length} 个包`);
  console.log(`  ${colorText(colors.yellow, 'ℹ️  跳过:')} ${packagesToSkip.length} 个包`);

  if (state.success.length > 0) {
    console.log(`\n${colorText(colors.green, '✅ 成功构建:')}`);
    state.success.forEach((name) => console.log(`  - ${name}`));
  }

  if (state.failed.length > 0) {
    console.log(`\n${colorText(colors.red, '❌ 构建失败:')}`);
    state.failed.forEach((name) => console.log(`  - ${name}`));
  }

  // 最终状态
  console.log('\n' + '='.repeat(60));
  if (state.failed.length === 0 && state.success.length > 0) {
    console.log(colorText(colors.bold, colors.green, '🎉 所有包构建成功！'));
  } else if (state.failed.length > 0) {
    console.log(
      colorText(colors.bold, colors.yellow, `⚠️  构建完成，但有 ${state.failed.length} 个包失败`),
    );
    if (!CONTINUE_ON_ERROR) {
      process.exit(1);
    }
  } else {
    console.log(colorText(colors.bold, '构建完成'));
  }
  console.log('='.repeat(60) + '\n');
}

// 运行主函数
try {
  main();
} catch (error) {
  logError(`构建过程出错: ${error}`);
  process.exit(1);
}
