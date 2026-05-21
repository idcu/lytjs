/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

// 根据 PUBLISH-MANIFEST.md 确定的 85 个可发布包路径
const publishablePackages = [
  // 1. 基础类型包
  'packages/shared-types',
  // 2. 核心运行时包
  'packages/host-contract',
  // 3. Common 工具包（31个）
  'packages/common/packages/a11y',
  'packages/common/packages/algorithm',
  'packages/common/packages/assertions',
  'packages/common/packages/async-scheduler',
  'packages/common/packages/cache',
  'packages/common/packages/common',
  'packages/common/packages/constants',
  'packages/common/packages/dom',
  'packages/common/packages/dom-helpers',
  'packages/common/packages/env',
  'packages/common/packages/error',
  'packages/common/packages/event-normalizer',
  'packages/common/packages/events',
  'packages/common/packages/http',
  'packages/common/packages/is',
  'packages/common/packages/keyboard',
  'packages/common/packages/memory',
  'packages/common/packages/node-cache',
  'packages/common/packages/object',
  'packages/common/packages/path',
  'packages/common/packages/performance',
  'packages/common/packages/query',
  'packages/common/packages/raf',
  'packages/common/packages/rate-limit',
  'packages/common/packages/render-queue',
  'packages/common/packages/scheduler',
  'packages/common/packages/security',
  'packages/common/packages/storage',
  'packages/common/packages/string',
  'packages/common/packages/timing',
  'packages/common/packages/transition-engine',
  'packages/common/packages/validate',
  'packages/common/packages/vnode',
  'packages/common/packages/warn',
  // 4. 核心框架包（13个）
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
  'packages/core-signal',
  'packages/core-vnode',
  'packages/ecosystem/packages/platform-adapter',
  // 5. 生态系统包（12个）
  'packages/ecosystem/packages/router',
  'packages/ecosystem/packages/router-fs',
  'packages/ecosystem/packages/store',
  'packages/ecosystem/packages/ssr',
  'packages/ecosystem/packages/ssr-kit/packages/ssg',
  'packages/ecosystem/packages/ssr-kit/packages/cache-isr',
  'packages/ecosystem/packages/ssr-kit/packages/html-renderer',
  'packages/ecosystem/packages/hmr',
  'packages/ecosystem/packages/api',
  'packages/ecosystem/packages/bundler',
  'packages/ecosystem/packages/compat',
  'packages/ecosystem/packages/devtools',
  'packages/ecosystem/packages/runtime-edge',
  'packages/ecosystem/packages/ui',
  // 6. Web 框架包（9个）
  'packages/ecosystem/packages/web-framework/packages/middleware',
  'packages/ecosystem/packages/web-framework/packages/middleware-auth',
  'packages/ecosystem/packages/web-framework/packages/middleware-cors',
  'packages/ecosystem/packages/web-framework/packages/middleware-rate-limit',
  'packages/ecosystem/packages/web-framework/packages/http-server',
  'packages/ecosystem/packages/web-framework/packages/metadata',
  'packages/ecosystem/packages/web-framework/packages/api',
  'packages/ecosystem/packages/web-framework/packages/router',
  'packages/ecosystem/packages/web-framework/packages/router-fs',
  // 7. 插件包（14个）
  'packages/plugins/packages/plugin-vite',
  'packages/plugins/packages/plugin-animation',
  'packages/plugins/packages/plugin-auth',
  'packages/plugins/packages/plugin-chart',
  'packages/plugins/packages/plugin-data',
  'packages/plugins/packages/plugin-data-fetch',
  'packages/plugins/packages/plugin-form',
  'packages/plugins/packages/plugin-i18n',
  'packages/plugins/packages/plugin-logger',
  'packages/plugins/packages/plugin-storage',
  'packages/plugins/packages/plugin-theme',
  'packages/plugins/packages/plugin-testing',
  'packages/plugins/packages/plugin-validation',
  // 8. 工具包（4个）
  'packages/tools/packages/test-utils',
  'packages/tools/packages/cli',
  'packages/tools/packages/devtools',
];

console.log('🔍 检查 85 个可发布包的 CHANGELOG.md 文件...\n');

const results = {
  total: publishablePackages.length,
  hasChangelog: 0,
  missingChangelog: 0,
  hasV660: 0,
  missingV660: 0,
  packages: [],
};

for (const pkgPath of publishablePackages) {
  const fullPath = path.join(rootDir, pkgPath);
  const changelogPath = path.join(fullPath, 'CHANGELOG.md');

  const pkgJsonPath = path.join(fullPath, 'package.json');
  let pkgName = pkgPath;
  try {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    pkgName = pkgJson.name || pkgPath;
  } catch (e) {
    // 忽略包解析错误，使用默认名称
  }

  const hasChangelog = fs.existsSync(changelogPath);
  let hasV660 = false;

  if (hasChangelog) {
    try {
      const content = fs.readFileSync(changelogPath, 'utf-8');
      hasV660 = content.includes('6.6.0');
    } catch (e) {
      hasV660 = false;
    }
  }

  const pkgResult = {
    path: pkgPath,
    name: pkgName,
    hasChangelog,
    hasV660,
  };

  results.packages.push(pkgResult);

  if (hasChangelog) {
    results.hasChangelog++;
    if (hasV660) {
      results.hasV660++;
    } else {
      results.missingV660++;
    }
  } else {
    results.missingChangelog++;
  }
}

// 输出统计
console.log('📊 统计结果：\n');
console.log(`   总包数: ${results.total}`);
console.log(`   有 CHANGELOG.md: ${results.hasChangelog}`);
console.log(`   缺少 CHANGELOG.md: ${results.missingChangelog}`);
console.log(`   包含 v6.6.0: ${results.hasV660}`);
console.log(`   缺少 v6.6.0: ${results.missingV660}`);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📋 详细包列表：\n');

console.log('🔴 缺少 CHANGELOG.md 的包：');
const missingChangelogs = results.packages.filter((p) => !p.hasChangelog);
if (missingChangelogs.length > 0) {
  missingChangelogs.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name} (${p.path})`);
  });
} else {
  console.log('   ✅ 全部都有 CHANGELOG.md');
}

console.log('\n🟡 有 CHANGELOG.md 但缺少 v6.6.0 的包：');
const missingV660 = results.packages.filter((p) => p.hasChangelog && !p.hasV660);
if (missingV660.length > 0) {
  missingV660.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name} (${p.path})`);
  });
} else {
  console.log('   ✅ 全部都有 v6.6.0');
}

console.log('\n✅ 检查完成！');

// 保存结果到 JSON 文件，方便后续使用
fs.writeFileSync(
  path.join(rootDir, 'changelog-check-result.json'),
  JSON.stringify(results, null, 2),
  'utf-8',
);
console.log('\n结果已保存到 changelog-check-result.json');
