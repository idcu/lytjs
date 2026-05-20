const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const packagesDir = path.join(rootDir, 'packages');

// All package.json files found by Glob
const packagePaths = [
  'packages/vdom/package.json',
  'packages/tools/packages/test-utils/package.json',
  'packages/tools/packages/devtools/package.json',
  'packages/tools/packages/cli/package.json',
  'packages/renderer/package.json',
  'packages/reactivity/package.json',
  'packages/plugins/packages/plugin-vite/package.json',
  'packages/plugins/packages/plugin-validation/package.json',
  'packages/plugins/packages/plugin-theme/package.json',
  'packages/plugins/packages/plugin-testing/package.json',
  'packages/plugins/packages/plugin-storage/package.json',
  'packages/plugins/packages/plugin-logger/package.json',
  'packages/plugins/packages/plugin-i18n/package.json',
  'packages/plugins/packages/plugin-form/package.json',
  'packages/plugins/packages/plugin-data-fetch/package.json',
  'packages/plugins/packages/plugin-data/package.json',
  'packages/plugins/packages/plugin-chart/package.json',
  'packages/plugins/packages/plugin-auth/package.json',
  'packages/plugins/packages/plugin-animation/package.json',
  'packages/ecosystem/packages/ui/package.json',
  'packages/ecosystem/packages/store/package.json',
  'packages/ecosystem/packages/ssr/package.json',
  'packages/ecosystem/packages/router/package.json',
  'packages/ecosystem/packages/platform-adapter/package.json',
  'packages/ecosystem/packages/devtools/package.json',
  'packages/ecosystem/packages/compat/package.json',
  'packages/ecosystem/packages/api/package.json',
  'packages/dom-runtime/package.json',
  'packages/dom/package.json',
  'packages/core-vnode/package.json',
  'packages/core-signal/package.json',
  'packages/core/package.json',
  'packages/component/package.json',
  'packages/compiler/package.json',
  'packages/common/packages/transition-engine/package.json',
  'packages/common/packages/string/package.json',
  'packages/common/packages/security/package.json',
  'packages/common/packages/scheduler/package.json',
  'packages/common/packages/render-queue/package.json',
  'packages/common/packages/performance/package.json',
  'packages/common/packages/object/package.json',
  'packages/common/packages/node-cache/package.json',
  'packages/common/packages/events/package.json',
  'packages/common/packages/event-normalizer/package.json',
  'packages/common/packages/error/package.json',
  'packages/common/packages/dom/package.json',
  'packages/common/packages/common/package.json',
  'packages/common/packages/async-scheduler/package.json',
  'packages/common/packages/assertions/package.json',
  'packages/common/package.json',
  'packages/adapter-web/package.json',
  'packages/web/package.json',
  'packages/tools/package.json',
  'packages/shared-types/package.json',
  'packages/plugins/package.json',
  'packages/host-contract/package.json',
  'packages/ecosystem/packages/runtime-edge/package.json',
  'packages/ecosystem/packages/router-fs/package.json',
  'packages/ecosystem/packages/hmr/package.json',
  'packages/ecosystem/packages/bundler/package.json',
  'packages/ecosystem/package.json',
  'packages/common/packages/warn/package.json',
  'packages/common/packages/vnode/package.json',
  'packages/common/packages/validate/package.json',
  'packages/common/packages/timing/package.json',
  'packages/common/packages/storage/package.json',
  'packages/common/packages/raf/package.json',
  'packages/common/packages/query/package.json',
  'packages/common/packages/path/package.json',
  'packages/common/packages/memory/package.json',
  'packages/common/packages/keyboard/package.json',
  'packages/common/packages/is/package.json',
  'packages/common/packages/http/package.json',
  'packages/common/packages/env/package.json',
  'packages/common/packages/dom-helpers/package.json',
  'packages/common/packages/constants/package.json',
  'packages/common/packages/cache/package.json',
  'packages/common/packages/algorithm/package.json',
  'packages/common/packages/a11y/package.json',
];

const results = {
  total: 0,
  publishable: [],
  private: [],
  monorepoRoots: [],
};

console.log('📦 开始核查 packages 目录下的所有包...\n');

packagePaths.forEach((pkgPath, index) => {
  const fullPath = path.join(rootDir, pkgPath);
  try {
    const pkgJson = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    results.total++;

    const isPrivate = pkgJson.private === true;
    const hasName = pkgJson.name && pkgJson.name.startsWith('@lytjs/');

    const dirParts = pkgPath.split('/');
    let isMonorepoRoot = false;
    if (dirParts[1] === 'common' && dirParts.length === 3) isMonorepoRoot = true;
    if (dirParts[1] === 'ecosystem' && dirParts.length === 3) isMonorepoRoot = true;
    if (dirParts[1] === 'plugins' && dirParts.length === 3) isMonorepoRoot = true;
    if (dirParts[1] === 'tools' && dirParts.length === 3) isMonorepoRoot = true;

    const info = {
      path: pkgPath,
      name: pkgJson.name || '(no name)',
      version: pkgJson.version || '(no version)',
      private: isPrivate,
      isMonorepoRoot,
    };

    if (isMonorepoRoot) {
      results.monorepoRoots.push(info);
      console.log(`[${String(index + 1).padStart(2, '0')}/81] 🏠 Monorepo 根包: ${info.name}`);
    } else if (isPrivate) {
      results.private.push(info);
      console.log(`[${String(index + 1).padStart(2, '0')}/81] 🔒 Private 包: ${info.name}`);
    } else {
      results.publishable.push(info);
      console.log(
        `[${String(index + 1).padStart(2, '0')}/81] ✅ 可发布包: ${info.name}@${info.version}`,
      );
    }
  } catch (e) {
    console.log(`[${index + 1}/81] ❌ 错误: ${pkgPath} - ${e.message}`);
  }
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 统计结果');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📦 总共有 ${results.total} 个 package.json 文件`);
console.log('');
console.log(`🏠 Monorepo 根包 (4个):`);
results.monorepoRoots.forEach((pkg) => console.log(`   - ${pkg.name}`));
console.log('');
console.log(`🔒 Private 包 (${results.private.length}个):`);
results.private.forEach((pkg) => console.log(`   - ${pkg.name}`));
console.log('');
console.log(`✅ 可发布包 (${results.publishable.length}个):`);
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 详细可发布包列表:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Group by category
const categories = {
  'L0 基础工具层': [],
  'L1 核心原语层': [],
  'L2 渲染引擎层': [],
  'L3 核心框架层': [],
  'L4 生态系统': [],
  'L5 UI 组件': [],
  'L6 插件系统': [],
  'L7 工具包': [],
};

results.publishable.forEach((pkg) => {
  if (pkg.path.includes('packages/common/packages/')) {
    categories['L0 基础工具层'].push(pkg);
  } else if (
    pkg.path.includes('packages/shared-types') ||
    pkg.path.includes('packages/host-contract') ||
    pkg.path.includes('packages/common/packages/common') ||
    pkg.path.includes('packages/reactivity') ||
    pkg.path.includes('packages/vdom')
  ) {
    categories['L1 核心原语层'].push(pkg);
  } else if (
    pkg.path.includes('packages/dom-runtime') ||
    pkg.path.includes('packages/compiler') ||
    pkg.path.includes('packages/component') ||
    pkg.path.includes('packages/renderer') ||
    pkg.path.includes('packages/adapter-web') ||
    pkg.path.includes('packages/dom') ||
    pkg.path.includes('packages/web')
  ) {
    categories['L2 渲染引擎层'].push(pkg);
  } else if (
    pkg.path.includes('packages/core') ||
    pkg.path.includes('packages/core-signal') ||
    pkg.path.includes('packages/core-vnode')
  ) {
    categories['L3 核心框架层'].push(pkg);
  } else if (
    pkg.path.includes('packages/ecosystem/') &&
    !pkg.path.includes('packages/ecosystem/packages/ui')
  ) {
    categories['L4 生态系统'].push(pkg);
  } else if (pkg.path.includes('packages/ecosystem/packages/ui')) {
    categories['L5 UI 组件'].push(pkg);
  } else if (pkg.path.includes('packages/plugins/')) {
    categories['L6 插件系统'].push(pkg);
  } else if (pkg.path.includes('packages/tools/')) {
    categories['L7 工具包'].push(pkg);
  }
});

for (const [cat, pkgs] of Object.entries(categories)) {
  console.log(`\n## ${cat} (${pkgs.length}个)`);
  pkgs.forEach((pkg) => {
    console.log(`   - ${pkg.name}@${pkg.version}`);
    console.log(`     路径: ${pkg.path}`);
  });
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📝 总结:');
console.log(`   - 总 package.json 文件: ${results.total}`);
console.log(`   - 可发布包: ${results.publishable.length}`);
console.log(`   - Monorepo 根包: ${results.monorepoRoots.length}`);
console.log(`   - Private 包: ${results.private.length}`);

// Check if we have runtime-edge
const hasRuntimeEdge = results.publishable.some((p) => p.name === '@lytjs/runtime-edge');
console.log(`\n⚠️  特别检查: @lytjs/runtime-edge ${hasRuntimeEdge ? '✅ 存在' : '❌ 缺失'}`);

if (!hasRuntimeEdge) {
  const runtimeEdgePath = path.join(
    packagesDir,
    'ecosystem',
    'packages',
    'runtime-edge',
    'package.json',
  );
  if (fs.existsSync(runtimeEdgePath)) {
    const runtimeEdgePkg = JSON.parse(fs.readFileSync(runtimeEdgePath, 'utf-8'));
    console.log(
      `   检查发现 runtime-edge 的 package.json 存在，但没有在 Glob 结果中或被过滤。name: ${runtimeEdgePkg.name}`,
    );
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

module.exports = results;
