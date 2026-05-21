#!/usr/bin/env tsx
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// 从 .npmrc_for_publish 读取 token
const npmrcPublishPath = join(ROOT, '.npmrc_for_publish');

// 完整的包列表，按照依赖顺序
const PACKAGES = [
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
  '@lytjs/common-env',
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
  '@lytjs/router',
  '@lytjs/router-fs',
  '@lytjs/store',
  '@lytjs/ssr',
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
  '@lytjs/runtime-edge',
  '@lytjs/cli',
];

// 找到所有包的路径
function findPackagePath(pkgName: string): string | null {
  const packagesDir = join(ROOT, 'packages');
  const searchDirs = [
    packagesDir,
    join(packagesDir, 'common'),
    join(packagesDir, 'ecosystem'),
    join(packagesDir, 'ecosystem', 'ssr-kit'),
    join(packagesDir, 'ecosystem', 'web-framework'),
    join(packagesDir, 'plugins'),
    join(packagesDir, 'tools'),
  ];

  for (const baseDir of searchDirs) {
    if (!existsSync(baseDir)) continue;

    const entries = readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = join(baseDir, entry.name);
        const pkgJsonPath = join(fullPath, 'package.json');
        if (existsSync(pkgJsonPath)) {
          const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
          if (pkg.name === pkgName) {
            return fullPath;
          }
        }

        // 递归检查子目录
        const subPath = findPackagePathInDir(fullPath, pkgName);
        if (subPath) return subPath;
      }
    }
  }
  return null;
}

function findPackagePathInDir(dir: string, targetPkgName: string): string | null {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      const fullPath = join(dir, entry.name);
      const pkgJsonPath = join(fullPath, 'package.json');
      if (existsSync(pkgJsonPath)) {
        const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
        if (pkg.name === targetPkgName) {
          return fullPath;
        }
      }
      const result = findPackagePathInDir(fullPath, targetPkgName);
      if (result) return result;
    }
  }
  return null;
}

console.log('🚀 Starting package publishing...\n');

// 从 .npmrc_for_publish 提取 token
let authToken = '';
if (existsSync(npmrcPublishPath)) {
  const npmrcContent = readFileSync(npmrcPublishPath, 'utf-8');
  const match = npmrcContent.match(/\/\/registry\.npmjs\.org\/:_authToken=([^\s]+)/);
  if (match) {
    authToken = match[1];
    console.log('✅ Token loaded from .npmrc_for_publish');
  }
}

const success: string[] = [];
const skipped: string[] = [];
const failed: string[] = [];

try {
  for (const pkgName of PACKAGES) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📦 Processing: ${pkgName}`);

    const pkgPath = findPackagePath(pkgName);
    if (!pkgPath) {
      console.log(`⚠️ Package ${pkgName} not found, skipping...`);
      skipped.push(pkgName);
      continue;
    }

    console.log(`📍 Path: ${pkgPath}`);

    const distPath = join(pkgPath, 'dist');
    if (!existsSync(distPath)) {
      console.log(`⚠️ dist directory not found, skipping...`);
      skipped.push(pkgName);
      continue;
    }

    const pkgJsonPath = join(pkgPath, 'package.json');
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));

    if (pkgJson.version !== '6.6.0') {
      console.log(`⚠️ Version mismatch: ${pkgJson.version}, skipping...`);
      skipped.push(pkgName);
      continue;
    }

    console.log(`📤 Publishing...`);

    try {
      const result = spawnSync(
        'npm',
        ['publish', '--access', 'public', `--//registry.npmjs.org/:_authToken=${authToken}`],
        {
          cwd: pkgPath,
          stdio: 'inherit',
          shell: true,
        },
      );

      if (result.status === 0) {
        console.log(`✅ ${pkgName} published successfully!`);
        success.push(pkgName);
      } else {
        console.log(`❌ ${pkgName} publish failed!`);
        failed.push(pkgName);
      }
    } catch (e) {
      console.log(`❌ ${pkgName} publish failed with exception!`);
      console.error(e);
      failed.push(pkgName);
    }
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 PUBLISHING SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Success: ${success.length} packages`);
  if (success.length > 0) {
    console.log(`   - ${success.join('\n   - ')}`);
  }
  console.log(`⚠️ Skipped: ${skipped.length} packages`);
  if (skipped.length > 0) {
    console.log(`   - ${skipped.join('\n   - ')}`);
  }
  console.log(`❌ Failed: ${failed.length} packages`);
  if (failed.length > 0) {
    console.log(`   - ${failed.join('\n   - ')}`);
  }

  // 保存总结
  const summary = {
    timestamp: new Date().toISOString(),
    success,
    skipped,
    failed,
  };
  writeFileSync(join(ROOT, 'publish-summary.json'), JSON.stringify(summary, null, 2));
  console.log(`\n💾 Summary saved to: publish-summary.json`);
} finally {
  // 无需恢复，因为没修改 .npmrc
}
