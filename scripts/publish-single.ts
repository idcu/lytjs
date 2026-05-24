#!/usr/bin/env tsx
/**
 * 单个包发布脚本 - 支持直接指定包名或路径发布
 *
 * 使用方法:
 *   tsx scripts/publish-single.ts @lytjs/reactivity
 *   tsx scripts/publish-single.ts packages/reactivity
 *   tsx scripts/publish-single.ts --all
 */

import { execSync } from 'child_process';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

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

  throw new Error(
    '未找到 npm token！请设置 .npmrc_for_publish 或 NPM_TOKEN 环境变量\n\n  可以从 .npmrc_for_publish.example 复制并修改:',
  );
}

function findPackage(arg: string) {
  // 通过包名查找
  const byName = PACKAGES.find((p) => p.name === arg);
  if (byName) {
    return byName;
  }

  // 通过路径查找
  const byPath = PACKAGES.find((p) => p.path.includes(arg) || arg.includes(basename(p.path)));
  if (byPath) {
    return byPath;
  }

  // 直接使用路径
  if (existsSync(join(ROOT, arg, 'package.json'))) {
    const pkgJsonPath = join(ROOT, arg, 'package.json');
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    return { name: pkgJson.name, path: arg };
  }

  return null;
}

async function publishSinglePackage(
  pkg: { name: string; path: string },
  token: string,
): Promise<boolean> {
  const pkgPath = join(ROOT, pkg.path);
  const npmrcPath = join(pkgPath, '.npmrc');
  let tempNpmrcCreated = false;

  try {
    console.log(`\n📦 发布: ${pkg.name}`);
    console.log(`📍 路径: ${pkg.path}`);

    // 检查 dist 是否存在
    const distPath = join(pkgPath, 'dist');
    if (!existsSync(distPath)) {
      console.log(`⚠️  dist 目录不存在，先构建...`);
      execSync('npm run build', { cwd: pkgPath, stdio: 'inherit' });
    }

    // 创建临时 .npmrc
    writeFileSync(
      npmrcPath,
      `registry=https://registry.npmjs.org/\n//registry.npmjs.org/:_authToken=${token}\n`,
    );
    tempNpmrcCreated = true;

    // 发布
    execSync('npm publish --access=public', {
      cwd: pkgPath,
      stdio: 'inherit',
    });

    console.log(`✅ 发布成功: ${pkg.name}`);
    return true;
  } catch (e: unknown) {
    const errorMsg =
      (e as { message?: string; stderr?: string }).message ||
      (e as { stderr?: string }).stderr ||
      String(e);

    if (errorMsg.includes('cannot publish over the previously published')) {
      console.log(`ℹ️  版本已存在，跳过: ${pkg.name}`);
      return true;
    }

    console.log(`❌ 发布失败: ${pkg.name}`);
    console.log(`   ${errorMsg}`);
    return false;
  } finally {
    // 清理临时 .npmrc
    if (tempNpmrcCreated && existsSync(npmrcPath)) {
      try {
        unlinkSync(npmrcPath);
      } catch (_e) {
        // 忽略删除错误
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  console.log('🚀 LytJS 单个包发布脚本\n');

  if (args.length === 0) {
    console.log('使用方法:');
    console.log('  tsx scripts/publish-single.ts @lytjs/reactivity');
    console.log('  tsx scripts/publish-single.ts packages/reactivity');
    console.log('  tsx scripts/publish-single.ts --all');
    console.log('\n可用的包:');
    PACKAGES.forEach((p) => console.log(`  - ${p.name}`));
    process.exit(1);
  }

  const token = getToken();

  if (args.includes('--all')) {
    console.log('📦 发布所有包...\n');
    const success: string[] = [];
    const failed: string[] = [];

    for (const pkg of PACKAGES) {
      const ok = await publishSinglePackage(pkg, token);
      if (ok) {
        success.push(pkg.name);
      } else {
        failed.push(pkg.name);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ 成功: ${success.length} 个包`);
    console.log(`❌ 失败: ${failed.length} 个包`);
    if (failed.length > 0) {
      console.log('   失败的包:', failed.join(', '));
    }
    console.log('='.repeat(80));
  } else {
    const arg = args[0];
    const pkg = findPackage(arg);

    if (!pkg) {
      console.log(`❌ 找不到包: ${arg}`);
      console.log('\n可用的包:');
      PACKAGES.forEach((p) => console.log(`  - ${p.name}`));
      process.exit(1);
    }

    const ok = await publishSinglePackage(pkg, token);
    process.exit(ok ? 0 : 1);
  }
}

main().catch(console.error);
