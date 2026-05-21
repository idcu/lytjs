/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 智能 Lint 检查脚本
 *
 * 功能：
 * 1. 逐个包检查
 * 2. 记录检查状态到 .lint-cache.json
 * 3. 只重新检查有变动的包或其依赖有变动的包
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CACHE_FILE = join(ROOT, '.lint-cache.json');

interface LintState {
  lastChecked: Record<string, number>;
  lastModified: Record<string, number>;
  lastSuccess: Record<string, boolean>;
}

interface PackageInfo {
  name: string;
  path: string;

  packageJson: any;
  dependencies: string[];
}

function loadState(): LintState {
  if (existsSync(CACHE_FILE)) {
    try {
      return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    } catch {
      // 忽略错误，使用默认状态
    }
  }
  return {
    lastChecked: {},
    lastModified: {},
    lastSuccess: {},
  };
}

function saveState(state: LintState): void {
  writeFileSync(CACHE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function getLastModified(dir: string): number {
  let latest = 0;
  function walk(path: string) {
    const stat = statSync(path);
    if (stat.mtimeMs > latest) latest = stat.mtimeMs;
    if (stat.isDirectory()) {
      const files = readdirSync(path);
      for (const file of files) {
        if (file === 'node_modules' || file === 'dist' || file === '.turbo') continue;
        walk(join(path, file));
      }
    }
  }
  try {
    walk(dir);
  } catch {
    // 忽略错误
  }
  return latest;
}

function getAllPackages(): PackageInfo[] {
  const packages: PackageInfo[] = [];

  const packagePaths = [
    // core packages
    'packages/shared-types',
    'packages/host-contract',
    'packages/reactivity',
    'packages/vdom',
    'packages/component',
    'packages/renderer',
    'packages/adapter-web',
    'packages/dom',
    'packages/web',
    'packages/compiler',
    'packages/core',
    'packages/core-signal',
    'packages/core-vnode',
    'packages/dom-runtime',

    // common packages
    'packages/common/packages/constants',
    'packages/common/packages/is',
    'packages/common/packages/security',
    'packages/common/packages/string',
    'packages/common/packages/path',
    'packages/common/packages/object',
    'packages/common/packages/error',
    'packages/common/packages/warn',
    'packages/common/packages/events',
    'packages/common/packages/cache',
    'packages/common/packages/timing',
    'packages/common/packages/algorithm',
    'packages/common/packages/vnode',
    'packages/common/packages/scheduler',
    'packages/common/packages/dom',
    'packages/common/packages/query',
    'packages/common/packages/dom-helpers',
    'packages/common/packages/a11y',
    'packages/common/packages/keyboard',
    'packages/common/packages/storage',
    'packages/common/packages/validate',
    'packages/common/packages/http',
    'packages/common/packages/raf',
    'packages/common/packages/rate-limit',
    'packages/common/packages/render-queue',
    'packages/common/packages/event-normalizer',
    'packages/common/packages/node-cache',
    'packages/common/packages/async-scheduler',
    'packages/common/packages/transition-engine',
    'packages/common/packages/performance',
    'packages/common/packages/assertions',
    'packages/common/packages/memory',
    'packages/common/packages/common',

    // ecosystem packages
    'packages/ecosystem/packages/api',
    'packages/ecosystem/packages/router',
    'packages/ecosystem/packages/router-fs',
    'packages/ecosystem/packages/store',
    'packages/ecosystem/packages/ssr',
    'packages/ecosystem/packages/ui',
    'packages/ecosystem/packages/devtools',
    'packages/ecosystem/packages/compat',
    'packages/ecosystem/packages/platform-adapter',
    'packages/ecosystem/packages/bundler',
    'packages/ecosystem/packages/hmr',
    'packages/ecosystem/packages/runtime-edge',

    // web-framework packages
    'packages/ecosystem/packages/web-framework/packages/api',
    'packages/ecosystem/packages/web-framework/packages/http-server',
    'packages/ecosystem/packages/web-framework/packages/metadata',
    'packages/ecosystem/packages/web-framework/packages/middleware',
    'packages/ecosystem/packages/web-framework/packages/middleware-cors',
    'packages/ecosystem/packages/web-framework/packages/middleware-auth',
    'packages/ecosystem/packages/web-framework/packages/middleware-rate-limit',
    'packages/ecosystem/packages/web-framework/packages/router',
    'packages/ecosystem/packages/web-framework/packages/router-fs',

    // ssr-kit packages
    'packages/ecosystem/packages/ssr-kit/packages/cache-isr',
    'packages/ecosystem/packages/ssr-kit/packages/hmr',
    'packages/ecosystem/packages/ssr-kit/packages/html-renderer',
    'packages/ecosystem/packages/ssr-kit/packages/ssg',
    'packages/ecosystem/packages/ssr-kit/packages/ssr',

    // plugins
    'packages/plugins/packages/plugin-vite',
    'packages/plugins/packages/plugin-theme',
    'packages/plugins/packages/plugin-logger',
    'packages/plugins/packages/plugin-auth',
    'packages/plugins/packages/plugin-storage',
    'packages/plugins/packages/plugin-i18n',
    'packages/plugins/packages/plugin-validation',
    'packages/plugins/packages/plugin-data',
    'packages/plugins/packages/plugin-data-fetch',
    'packages/plugins/packages/plugin-chart',
    'packages/plugins/packages/plugin-animation',
    'packages/plugins/packages/plugin-testing',
    'packages/plugins/packages/plugin-form',

    // tools
    'packages/tools/packages/cli',
    'packages/tools/packages/devtools',
    'packages/tools/packages/test-utils',
  ];

  for (const pkgPath of packagePaths) {
    const fullPath = join(ROOT, pkgPath);
    const pkgJsonPath = join(fullPath, 'package.json');
    if (!existsSync(pkgJsonPath)) continue;

    try {
      const packageJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
      const dependencies: string[] = [];

      for (const field of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
        if (packageJson[field]) {
          for (const dep of Object.keys(packageJson[field])) {
            if (dep.startsWith('@lytjs/')) {
              dependencies.push(dep);
            }
          }
        }
      }

      packages.push({
        name: packageJson.name,
        path: fullPath,
        packageJson,
        dependencies,
      });
    } catch {
      // 跳过无法读取的包
    }
  }

  return packages;
}

function shouldRecheck(pkg: PackageInfo, state: LintState, allPackages: PackageInfo[]): boolean {
  const lastModified = getLastModified(pkg.path);

  // 如果没有检查记录，必须检查
  if (!(pkg.name in state.lastChecked)) return true;

  // 如果文件有变动，需要检查
  if (state.lastModified[pkg.name] !== lastModified) return true;

  // 检查依赖是否有变动
  for (const depName of pkg.dependencies) {
    const depPkg = allPackages.find((p) => p.name === depName);
    if (depPkg) {
      const depLastModified = getLastModified(depPkg.path);
      // 如果依赖在我们上次检查后被修改过
      if (state.lastChecked[pkg.name] && state.lastModified[depName] !== depLastModified) {
        return true;
      }
    }
  }

  return false;
}

function runLint(pkg: PackageInfo): boolean {
  console.log(`\n🔍 检查 ${pkg.name}...`);
  try {
    // 使用 eslint 缓存，大幅提高速度
    execSync('npx eslint src --ext ts,tsx,js,jsx --cache', {
      cwd: pkg.path,
      stdio: 'inherit',
    });
    console.log(`✅ ${pkg.name} 通过 Lint 检查`);
    return true;
  } catch {
    console.log(`❌ ${pkg.name} Lint 检查失败`);
    return false;
  }
}

function main(): void {
  console.log('🚀 LytJS 智能 Lint 检查\n');

  const state = loadState();
  const allPackages = getAllPackages();

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  const failedPackages: string[] = [];

  console.log(`📦 发现 ${allPackages.length} 个包\n`);

  for (const pkg of allPackages) {
    const needCheck = shouldRecheck(pkg, state, allPackages);

    if (!needCheck && state.lastSuccess[pkg.name]) {
      console.log(`⏭️  跳过 ${pkg.name}（无变动）`);
      skipCount++;
      successCount++;
      continue;
    }

    const success = runLint(pkg);
    const now = Date.now();
    const lastModified = getLastModified(pkg.path);

    state.lastChecked[pkg.name] = now;
    state.lastModified[pkg.name] = lastModified;
    state.lastSuccess[pkg.name] = success;

    if (success) {
      successCount++;
    } else {
      failCount++;
      failedPackages.push(pkg.name);
    }

    // 每检查一个包就保存一次状态，避免中断后丢失
    saveState(state);
  }

  console.log('\n========================================');
  console.log('📊 Lint 检查统计\n');
  console.log(`✅ 通过: ${successCount}`);
  console.log(`❌ 失败: ${failCount}`);
  console.log(`⏭️  跳过: ${skipCount}`);

  if (failedPackages.length > 0) {
    console.log('\n❌ 失败的包:');
    failedPackages.forEach((pkg) => console.log(`   - ${pkg}`));
  }

  console.log('\n💾 检查状态已保存到 .lint-cache.json');
  console.log('\n提示：下次运行时将只检查有变动的包！');

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
