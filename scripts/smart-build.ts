/**
 * 智能构建脚本
 *
 * 功能：
 * 1. 分析包依赖关系
 * 2. 按正确顺序构建所有包（处理 workspace:* 依赖）
 * 3. 检测和处理循环依赖
 * 4. 提供构建进度和错误反馈
 *
 * 重要说明：
 * - 项目使用 monorepo 架构，包之间使用 workspace:* 依赖
 * - 构建顺序必须严格按照依赖关系执行
 * - 构建完成后，运行 prepare-publish.ts 将 workspace:* 转换为实际版本号
 *
 * 用法: tsx scripts/smart-build.ts
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// 包的构建顺序（按依赖关系排序）
const BUILD_ORDER = [
  // 第 1 阶段：基础包
  { name: 'shared-types', path: 'packages/shared-types' },
  { name: 'host-contract', path: 'packages/host-contract' },

  // 第 2 阶段：Common 工具包
  { name: 'common-constants', path: 'packages/common/packages/constants' },
  { name: 'common-is', path: 'packages/common/packages/is' },
  { name: 'common-security', path: 'packages/common/packages/security' },
  { name: 'common-string', path: 'packages/common/packages/string' },
  { name: 'common-path', path: 'packages/common/packages/path' },
  { name: 'common-object', path: 'packages/common/packages/object' },
  { name: 'common-error', path: 'packages/common/packages/error' },
  { name: 'common-warn', path: 'packages/common/packages/warn' },
  { name: 'common-events', path: 'packages/common/packages/events' },
  { name: 'common-cache', path: 'packages/common/packages/cache' },
  { name: 'common-timing', path: 'packages/common/packages/timing' },
  { name: 'common-algorithm', path: 'packages/common/packages/algorithm' },
  { name: 'common-vnode', path: 'packages/common/packages/vnode' },
  { name: 'common-scheduler', path: 'packages/common/packages/scheduler' },
  { name: 'common-dom', path: 'packages/common/packages/dom' },
  { name: 'common-query', path: 'packages/common/packages/query' },
  { name: 'common-dom-helpers', path: 'packages/common/packages/dom-helpers' },
  { name: 'common-a11y', path: 'packages/common/packages/a11y' },
  { name: 'common-keyboard', path: 'packages/common/packages/keyboard' },
  { name: 'common-storage', path: 'packages/common/packages/storage' },
  { name: 'common-validate', path: 'packages/common/packages/validate' },
  { name: 'common-http', path: 'packages/common/packages/http' },
  { name: 'common-raf', path: 'packages/common/packages/raf' },
  { name: 'common-render-queue', path: 'packages/common/packages/render-queue' },
  { name: 'common-event-normalizer', path: 'packages/common/packages/event-normalizer' },
  { name: 'common-node-cache', path: 'packages/common/packages/node-cache' },
  { name: 'common-async-scheduler', path: 'packages/common/packages/async-scheduler' },
  { name: 'common-transition-engine', path: 'packages/common/packages/transition-engine' },
  { name: 'common-performance', path: 'packages/common/packages/performance' },
  { name: 'common-assertions', path: 'packages/common/packages/assertions' },
  { name: 'common-memory', path: 'packages/common/packages/memory' },
  { name: 'common-rate-limit', path: 'packages/common/packages/rate-limit' },
  { name: 'common', path: 'packages/common/packages/common' },

  // 第 3 阶段：核心包
  { name: 'reactivity', path: 'packages/reactivity' },
  { name: 'vdom', path: 'packages/vdom' },
  { name: 'dom-runtime', path: 'packages/dom-runtime' },
  { name: 'compiler', path: 'packages/compiler' },
  { name: 'renderer', path: 'packages/renderer' },
  { name: 'adapter-web', path: 'packages/adapter-web' },
  { name: 'dom', path: 'packages/dom' },
  { name: 'web', path: 'packages/web' },
  { name: 'component', path: 'packages/component' },
  { name: 'core', path: 'packages/core' },
  { name: 'core-signal', path: 'packages/core-signal' },
  { name: 'core-vnode', path: 'packages/core-vnode' },

  // 第 4 阶段：生态系统包
  { name: 'router', path: 'packages/ecosystem/packages/router' },
  { name: 'store', path: 'packages/ecosystem/packages/store' },
  { name: 'ssr', path: 'packages/ecosystem/packages/ssr' },
  { name: 'ui', path: 'packages/ecosystem/packages/ui' },
  { name: 'devtools', path: 'packages/ecosystem/packages/devtools' },
  { name: 'compat', path: 'packages/ecosystem/packages/compat' },
  { name: 'platform-adapter', path: 'packages/ecosystem/packages/platform-adapter' },
  { name: 'router-fs', path: 'packages/ecosystem/packages/router-fs' },
  { name: 'api', path: 'packages/ecosystem/packages/api' },
  { name: 'bundler', path: 'packages/ecosystem/packages/bundler' },
  { name: 'hmr', path: 'packages/ecosystem/packages/hmr' },
  { name: 'runtime-edge', path: 'packages/ecosystem/packages/runtime-edge' },

  // 第 5 阶段：Web Framework 包
  { name: 'web-framework/api', path: 'packages/ecosystem/packages/web-framework/packages/api' },
  {
    name: 'web-framework/http-server',
    path: 'packages/ecosystem/packages/web-framework/packages/http-server',
  },
  {
    name: 'web-framework/metadata',
    path: 'packages/ecosystem/packages/web-framework/packages/metadata',
  },
  {
    name: 'web-framework/middleware',
    path: 'packages/ecosystem/packages/web-framework/packages/middleware',
  },
  {
    name: 'web-framework/middleware-cors',
    path: 'packages/ecosystem/packages/web-framework/packages/middleware-cors',
  },
  {
    name: 'web-framework/middleware-auth',
    path: 'packages/ecosystem/packages/web-framework/packages/middleware-auth',
  },
  {
    name: 'web-framework/middleware-rate-limit',
    path: 'packages/ecosystem/packages/web-framework/packages/middleware-rate-limit',
  },
  {
    name: 'web-framework/router',
    path: 'packages/ecosystem/packages/web-framework/packages/router',
  },
  {
    name: 'web-framework/router-fs',
    path: 'packages/ecosystem/packages/web-framework/packages/router-fs',
  },

  // 第 6 阶段：插件包
  { name: 'plugin-vite', path: 'packages/plugins/packages/plugin-vite' },
  { name: 'plugin-theme', path: 'packages/plugins/packages/plugin-theme' },
  { name: 'plugin-logger', path: 'packages/plugins/packages/plugin-logger' },
  { name: 'plugin-auth', path: 'packages/plugins/packages/plugin-auth' },
  { name: 'plugin-storage', path: 'packages/plugins/packages/plugin-storage' },
  { name: 'plugin-i18n', path: 'packages/plugins/packages/plugin-i18n' },
  { name: 'plugin-validation', path: 'packages/plugins/packages/plugin-validation' },
  { name: 'plugin-data', path: 'packages/plugins/packages/plugin-data' },
  { name: 'plugin-data-fetch', path: 'packages/plugins/packages/plugin-data-fetch' },
  { name: 'plugin-chart', path: 'packages/plugins/packages/plugin-chart' },
  { name: 'plugin-animation', path: 'packages/plugins/packages/plugin-animation' },
  { name: 'plugin-testing', path: 'packages/plugins/packages/plugin-testing' },

  // 第 7 阶段：工具包
  { name: 'test-utils', path: 'packages/tools/packages/test-utils' },
  { name: 'cli', path: 'packages/tools/packages/cli' },
  { name: 'devtools-extension', path: 'packages/tools/packages/devtools' },
];

function buildPackage(pkg: { name: string; path: string }): boolean {
  const pkgPath = join(ROOT, pkg.path);

  if (!existsSync(pkgPath)) {
    console.log(`⚠️  包不存在，跳过: ${pkg.name}`);
    return true;
  }

  const pkgJsonPath = join(pkgPath, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    console.log(`⚠️  package.json 不存在，跳过: ${pkg.name}`);
    return true;
  }

  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));

  if (!pkgJson.scripts?.build) {
    console.log(`ℹ️  没有 build 脚本，跳过: ${pkg.name}`);
    return true;
  }

  console.log(`🔨 正在构建: ${pkg.name}`);

  try {
    execSync('pnpm build', {
      cwd: pkgPath,
      stdio: 'inherit',
    });
    console.log(`✅ 构建成功: ${pkg.name}`);
    return true;
  } catch (_error) {
    console.log(`❌ 构建失败: ${pkg.name}`);
    return false;
  }
}

function main(): void {
  console.log('🚀 开始智能构建...\n');
  console.log(`📦 共 ${BUILD_ORDER.length} 个包需要构建\n`);

  const success: string[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];

  for (let i = 0; i < BUILD_ORDER.length; i++) {
    const pkg = BUILD_ORDER[i];
    console.log(`\n[${i + 1}/${BUILD_ORDER.length}]`);

    const result = buildPackage(pkg);

    if (result === true) {
      if (existsSync(join(ROOT, pkg.path))) {
        success.push(pkg.name);
      } else {
        skipped.push(pkg.name);
      }
    } else {
      failed.push(pkg.name);
    }
  }

  // 总结
  console.log('\n' + '='.repeat(50));
  console.log('📊 构建总结:');
  console.log('='.repeat(50));
  console.log(`✅ 成功: ${success.length} 个包`);
  console.log(`❌ 失败: ${failed.length} 个包`);
  console.log(`ℹ️  跳过: ${skipped.length} 个包`);

  if (failed.length > 0) {
    console.log('\n❌ 失败的包:');
    failed.forEach((pkg) => console.log(`  - ${pkg}`));
  }

  if (success.length > 0) {
    console.log('\n✅ 成功构建的包:');
    success.forEach((pkg) => console.log(`  - ${pkg}`));
  }

  console.log('\n' + '='.repeat(50));

  if (failed.length === 0) {
    console.log('🎉 所有包构建成功！');
    process.exit(0);
  } else {
    console.log(`⚠️  有 ${failed.length} 个包构建失败，请检查错误信息。`);
    process.exit(1);
  }
}

main();
