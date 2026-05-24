#!/usr/bin/env tsx

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

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

function logError(message: string): void {
  console.error(colorText(colors.red, `❌ ${message}`));
}

function logSection(title: string): void {
  console.log(`\n${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

interface BuildResult {
  name: string;
  path: string;
  success: boolean;
}

const results: BuildResult[] = [];

function buildPackage(pkgPath: string): boolean {
  const fullPath = join(ROOT, pkgPath);
  const pkgJsonPath = join(fullPath, 'package.json');

  if (!existsSync(pkgJsonPath)) {
    logInfo(`跳过: ${pkgPath} (无 package.json)`);
    return false;
  }

  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
  const packageName = pkgJson.name || pkgPath;

  if (!pkgJson.scripts?.build) {
    logInfo(`跳过: ${packageName} (无 build 脚本)`);
    return false;
  }

  logInfo(`正在构建: ${colorText(colors.bold, packageName)}`);
  logInfo(`路径: ${pkgPath}`);

  try {
    // 直接使用根目录 node_modules 中的 tsup
    const tsupEntry = join(ROOT, 'node_modules', 'tsup', 'dist', 'cli-default.js');
    execSync(`node "${tsupEntry}"`, {
      cwd: fullPath,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    });

    logSuccess(`构建成功: ${packageName}`);
    results.push({ name: packageName, path: pkgPath, success: true });
    return true;
  } catch (_error) {
    logError(`构建失败: ${packageName}`);
    results.push({ name: packageName, path: pkgPath, success: false });
    return false;
  }
}

function main(): void {
  console.log(colorText(colors.bold, '\n🚀 LytJS 按步骤构建系统\n'));

  logSection('步骤 1: 构建 Common 包 (34个)');
  const commonPackages = [
    'packages/common/packages/constants',
    'packages/common/packages/is',
    'packages/common/packages/object',
    'packages/common/packages/string',
    'packages/common/packages/security',
    'packages/common/packages/path',
    'packages/common/packages/events',
    'packages/common/packages/cache',
    'packages/common/packages/timing',
    'packages/common/packages/scheduler',
    'packages/common/packages/error',
    'packages/common/packages/algorithm',
    'packages/common/packages/vnode',
    'packages/common/packages/env',
    'packages/common/packages/common',
    'packages/common/packages/dom',
    'packages/common/packages/dom-helpers',
    'packages/common/packages/a11y',
    'packages/common/packages/keyboard',
    'packages/common/packages/storage',
    'packages/common/packages/validate',
    'packages/common/packages/http',
    'packages/common/packages/raf',
    'packages/common/packages/render-queue',
    'packages/common/packages/event-normalizer',
    'packages/common/packages/node-cache',
    'packages/common/packages/async-scheduler',
    'packages/common/packages/transition-engine',
    'packages/common/packages/performance',
    'packages/common/packages/assertions',
    'packages/common/packages/memory',
    'packages/common/packages/query',
    'packages/common/packages/rate-limit',
    'packages/common/packages/warn',
  ];

  for (const pkg of commonPackages) {
    buildPackage(pkg);
  }

  logSection('步骤 2: 构建 Core 包 (14个)');
  const corePackages = [
    'packages/shared-types',
    'packages/host-contract',
    'packages/reactivity',
    'packages/vdom',
    'packages/dom-runtime',
    'packages/compiler',
    'packages/renderer',
    'packages/adapter-web',
    'packages/dom',
    'packages/web',
    'packages/component',
    'packages/core',
    'packages/core-vnode',
    'packages/core-signal',
  ];

  for (const pkg of corePackages) {
    buildPackage(pkg);
  }

  logSection('步骤 3: 构建 Ecosystem 基础包 (14个)');
  const ecosystemPackages = [
    'packages/ecosystem/packages/router',
    'packages/ecosystem/packages/store',
    'packages/ecosystem/packages/ssr',
    'packages/ecosystem/packages/ui',
    'packages/ecosystem/packages/devtools',
    'packages/ecosystem/packages/compat',
    'packages/ecosystem/packages/platform-adapter',
    'packages/ecosystem/packages/bundler',
    'packages/ecosystem/packages/runtime-edge',
    'packages/ecosystem/packages/router-fs',
    'packages/ecosystem/packages/api',
    'packages/ecosystem/packages/hmr',
  ];

  for (const pkg of ecosystemPackages) {
    buildPackage(pkg);
  }

  logSection('步骤 4: 构建 Web-Framework 子包 (9个)');
  const webFrameworkPackages = [
    'packages/ecosystem/packages/web-framework/packages/api',
    'packages/ecosystem/packages/web-framework/packages/http-server',
    'packages/ecosystem/packages/web-framework/packages/metadata',
    'packages/ecosystem/packages/web-framework/packages/middleware',
    'packages/ecosystem/packages/web-framework/packages/middleware-cors',
    'packages/ecosystem/packages/web-framework/packages/middleware-auth',
    'packages/ecosystem/packages/web-framework/packages/middleware-rate-limit',
    'packages/ecosystem/packages/web-framework/packages/router',
    'packages/ecosystem/packages/web-framework/packages/router-fs',
  ];

  for (const pkg of webFrameworkPackages) {
    buildPackage(pkg);
  }

  logSection('步骤 5: 构建 SSR-Kit 子包 (6个)');
  const ssrKitPackages = [
    'packages/ecosystem/packages/ssr-kit/packages/cache',
    'packages/ecosystem/packages/ssr-kit/packages/cache-isr',
    'packages/ecosystem/packages/ssr-kit/packages/hmr',
    'packages/ecosystem/packages/ssr-kit/packages/html-renderer',
    'packages/ecosystem/packages/ssr-kit/packages/ssg',
    'packages/ecosystem/packages/ssr-kit/packages/ssr',
  ];

  for (const pkg of ssrKitPackages) {
    buildPackage(pkg);
  }

  logSection('步骤 6: 构建 Tools 包 (3个)');
  const toolsPackages = [
    'packages/tools/packages/cli',
    'packages/tools/packages/devtools',
    'packages/tools/packages/test-utils',
  ];

  for (const pkg of toolsPackages) {
    buildPackage(pkg);
  }

  logSection('步骤 7: 构建 Plugins 包 (13个)');
  const pluginsPackages = [
    'packages/plugins/packages/plugin-vite',
    'packages/plugins/packages/plugin-auth',
    'packages/plugins/packages/plugin-storage',
    'packages/plugins/packages/plugin-i18n',
    'packages/plugins/packages/plugin-form',
    'packages/plugins/packages/plugin-data',
    'packages/plugins/packages/plugin-data-fetch',
    'packages/plugins/packages/plugin-chart',
    'packages/plugins/packages/plugin-animation',
    'packages/plugins/packages/plugin-testing',
    'packages/plugins/packages/plugin-theme',
    'packages/plugins/packages/plugin-logger',
    'packages/plugins/packages/plugin-validation',
  ];

  for (const pkg of pluginsPackages) {
    buildPackage(pkg);
  }

  logSection('构建总结');
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log(`📊 统计:`);
  console.log(`  ${colorText(colors.green, '✅ 成功:')} ${successCount} 个包`);
  console.log(`  ${colorText(colors.red, '❌ 失败:')} ${failCount} 个包`);

  if (successCount > 0) {
    console.log(`\n${colorText(colors.green, '✅ 成功构建:')}`);
    results.filter((r) => r.success).forEach((r) => console.log(`  - ${r.name}`));
  }

  if (failCount > 0) {
    console.log(`\n${colorText(colors.red, '❌ 构建失败:')}`);
    results.filter((r) => !r.success).forEach((r) => console.log(`  - ${r.name}`));
  }

  console.log('\n' + '='.repeat(60));
  if (failCount === 0 && successCount > 0) {
    console.log(colorText(colors.bold, colors.green, '🎉 所有包构建成功！'));
  } else if (failCount > 0) {
    console.log(colorText(colors.bold, colors.yellow, `⚠️  构建完成，但有 ${failCount} 个包失败`));
  } else {
    console.log(colorText(colors.bold, '构建完成'));
  }
  console.log('='.repeat(60) + '\n');

  writeFileSync(join(ROOT, 'build-results.json'), JSON.stringify(results, null, 2));
}

main();
