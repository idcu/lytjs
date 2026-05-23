#!/usr/bin/env tsx
/**
 * LytJS 智能发布脚本
 *
 * 为什么需要临时 .npmrc：
 * 1. npm 配置优先级：子包目录的 .npmrc 优先级更高
 * 2. pnpm workspace 的影响：根目录的配置有时会被 workspace 配置覆盖
 * 3. 发布上下文：在子包目录执行 npm publish 时，npm 首先在子包目录查找配置
 *
 * 本脚本会：
 * 1. 使用根目录的 .npmrc_for_publish（如果存在）
 * 2. 否则使用环境变量或用户提供的 token
 * 3. 在每个包目录临时创建 .npmrc 确保发布顺利
 * 4. 发布完成后清理临时文件
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

// 正确的发布顺序 - 严格按依赖关系排序
const PACKAGES = [
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
  { name: '@lytjs/cache-isr', path: 'packages/ecosystem/packages/ssr-kit/packages/cache-isr' },
  {
    name: '@lytjs/html-renderer',
    path: 'packages/ecosystem/packages/ssr-kit/packages/html-renderer',
  },
  { name: '@lytjs/ssg', path: 'packages/ecosystem/packages/ssr-kit/packages/ssg' },
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
];

console.log('🚀 LytJS 智能发布脚本\n');

// 获取 token
function getToken(): string {
  // 1. 优先从 .npmrc_for_publish 读取
  const npmrcPublishPath = join(ROOT, '.npmrc_for_publish');
  if (existsSync(npmrcPublishPath)) {
    const content = readFileSync(npmrcPublishPath, 'utf-8');
    const tokenMatch = content.match(/\/\/registry\.npmjs\.org\/:_authToken=([^\s]+)/);
    if (tokenMatch) {
      console.log('✅ 从 .npmrc_for_publish 读取 token');
      return tokenMatch[1];
    }
  }

  // 2. 其次从环境变量读取
  if (process.env.NPM_TOKEN) {
    console.log('✅ 从环境变量 NPM_TOKEN 读取 token');
    return process.env.NPM_TOKEN;
  }

  throw new Error('未找到 npm token！请设置 .npmrc_for_publish 或 NPM_TOKEN 环境变量');
}

const success: string[] = [];
const failed: string[] = [];
const skipped: string[] = [];
const token = getToken();

// 临时 .npmrc 文件路径数组，用于后续清理
const tempNpmrcPaths: string[] = [];

try {
  for (let i = 0; i < PACKAGES.length; i++) {
    const pkg = PACKAGES[i];
    const pkgPath = join(ROOT, pkg.path);
    const npmrcPath = join(pkgPath, '.npmrc');

    console.log(`\n📦 [${i + 1}/${PACKAGES.length}] 正在发布: ${pkg.name}`);
    console.log(`📍 路径: ${pkg.path}`);

    try {
      // 在包目录中临时创建 .npmrc
      writeFileSync(
        npmrcPath,
        `registry=https://registry.npmjs.org/\n//registry.npmjs.org/:_authToken=${token}\n`,
      );
      tempNpmrcPaths.push(npmrcPath);

      // 发布
      execSync('npm publish --access=public', {
        cwd: pkgPath,
        stdio: 'inherit',
      });

      console.log(`✅ 发布成功: ${pkg.name}`);
      success.push(pkg.name);
    } catch (e: unknown) {
      const errorMsg = (e as { message?: string }).message || String(e);
      if (errorMsg.includes('cannot publish over the previously published')) {
        console.log(`ℹ️  版本已存在，跳过: ${pkg.name}`);
        skipped.push(pkg.name);
      } else {
        console.log(`❌ 发布失败: ${pkg.name}`);
        failed.push(pkg.name);
      }
    }

    // 延迟避免请求过快
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
} finally {
  // 清理所有临时 .npmrc
  console.log('\n🧹 清理临时文件...');
  for (const npmrcPath of tempNpmrcPaths) {
    if (existsSync(npmrcPath)) {
      try {
        unlinkSync(npmrcPath);
      } catch (_e) {
        // 忽略删除错误
      }
    }
  }
  console.log('✅ 临时文件已清理');
}

// 输出结果
console.log('\n' + '='.repeat(80));
console.log('📊 发布结果汇总:');
console.log(`✅ 成功: ${success.length} 个包`);
console.log(`ℹ️  跳过: ${skipped.length} 个包`);
console.log(`❌ 失败: ${failed.length} 个包`);

if (success.length > 0) {
  console.log('\n✅ 成功的包:');
  console.log(success.map((name) => `  - ${name}`).join('\n'));
}
if (skipped.length > 0) {
  console.log('\nℹ️  跳过的包:');
  console.log(skipped.map((name) => `  - ${name}`).join('\n'));
}
if (failed.length > 0) {
  console.log('\n❌ 失败的包:');
  console.log(failed.map((name) => `  - ${name}`).join('\n'));
}
console.log('='.repeat(80) + '\n');
