#!/usr/bin/env tsx
/**
 * 检查所有包的 npm 发布状态
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

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
  { name: '@lytjs/cache', path: 'packages/ecosystem/packages/ssr-kit/packages/cache' },
  { name: '@lytjs/cache-isr', path: 'packages/ecosystem/packages/ssr-kit/packages/cache-isr' },
  {
    name: '@lytjs/html-renderer',
    path: 'packages/ecosystem/packages/ssr-kit/packages/html-renderer',
  },
  { name: '@lytjs/ssg', path: 'packages/ecosystem/packages/ssr-kit/packages/ssg' },
  {
    name: '@lytjs/http-server',
    path: 'packages/ecosystem/packages/web-framework/packages/http-server',
  },
  { name: '@lytjs/metadata', path: 'packages/ecosystem/packages/web-framework/packages/metadata' },
  {
    name: '@lytjs/middleware',
    path: 'packages/ecosystem/packages/web-framework/packages/middleware',
  },
  {
    name: '@lytjs/middleware-cors',
    path: 'packages/ecosystem/packages/web-framework/packages/middleware-cors',
  },
  {
    name: '@lytjs/middleware-auth',
    path: 'packages/ecosystem/packages/web-framework/packages/middleware-auth',
  },
  {
    name: '@lytjs/middleware-rate-limit',
    path: 'packages/ecosystem/packages/web-framework/packages/middleware-rate-limit',
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

function getPackageVersion(packagePath: string): string {
  const pkgPath = join(ROOT, packagePath, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  return pkg.version;
}

async function checkPackagePublished(
  packageName: string,
  _expectedVersion: string,
): Promise<{
  published: boolean;
  version?: string;
  latestVersion?: string;
  error?: string;
}> {
  try {
    const result = execSync(
      `npm view ${packageName} version --registry=https://registry.npmjs.org/`,
      {
        encoding: 'utf-8',
        stdio: 'pipe',
      },
    );
    const latestVersion = result.trim();
    return {
      published: true,
      version: latestVersion,
      latestVersion,
    };
  } catch (e) {
    const errorMsg = (e as { stderr?: string }).stderr || String(e);
    if (errorMsg.includes('404') || errorMsg.includes('not found')) {
      return {
        published: false,
        error: 'Package not found on npm',
      };
    }
    return {
      published: false,
      error: errorMsg,
    };
  }
}

async function main() {
  console.log('📦 LytJS npm 发布状态检查\n');
  console.log('='.repeat(80));

  const published: string[] = [];
  const notPublished: string[] = [];
  const needsUpdate: string[] = [];
  const errors: string[] = [];

  for (const pkg of PACKAGES) {
    const expectedVersion = getPackageVersion(pkg.path);
    console.log(`\n🔍 检查: ${pkg.name}@${expectedVersion}`);

    try {
      const result = await checkPackagePublished(pkg.name, expectedVersion);

      if (result.published && result.version) {
        if (result.version === expectedVersion) {
          console.log(`✅ 已发布: ${pkg.name}@${result.version}`);
          published.push(`${pkg.name}@${result.version}`);
        } else {
          console.log(`⚠️  版本不匹配: 本地=${expectedVersion}, npm=${result.version}`);
          needsUpdate.push(`${pkg.name}@${expectedVersion} (npm=${result.version})`);
        }
      } else {
        console.log(`❌ 未发布: ${pkg.name}`);
        notPublished.push(`${pkg.name}@${expectedVersion}`);
      }
    } catch (e) {
      console.log(`❌ 检查失败: ${pkg.name}`);
      errors.push(`${pkg.name} - ${String(e)}`);
    }

    // 避免请求过快
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 检查结果汇总:');
  console.log(`✅ 已发布 (最新版本): ${published.length} 个包`);
  console.log(`⚠️  版本不匹配: ${needsUpdate.length} 个包`);
  console.log(`❌ 未发布: ${notPublished.length} 个包`);
  console.log(`⚠️  检查错误: ${errors.length} 个包`);

  if (published.length > 0) {
    console.log('\n✅ 已发布的包:');
    published.forEach((name) => console.log(`  - ${name}`));
  }

  if (needsUpdate.length > 0) {
    console.log('\n⚠️  版本不匹配的包:');
    needsUpdate.forEach((name) => console.log(`  - ${name}`));
  }

  if (notPublished.length > 0) {
    console.log('\n❌ 未发布的包:');
    notPublished.forEach((name) => console.log(`  - ${name}`));
  }

  if (errors.length > 0) {
    console.log('\n⚠️  检查错误的包:');
    errors.forEach((name) => console.log(`  - ${name}`));
  }

  console.log('='.repeat(80));
}

main().catch(console.error);
