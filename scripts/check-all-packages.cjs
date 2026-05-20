const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 从发布脚本获取包顺序
const publishOrder = [
  // L0: 基础工具层
  'packages/shared-types',
  'packages/common/packages/constants',
  'packages/common/packages/is',
  'packages/common/packages/object',
  'packages/common/packages/string',
  'packages/common/packages/path',
  'packages/common/packages/error',
  'packages/common/packages/warn',
  'packages/common/packages/events',
  'packages/common/packages/cache',
  'packages/common/packages/timing',
  'packages/common/packages/scheduler',
  'packages/common/packages/algorithm',
  'packages/common/packages/vnode',
  'packages/common/packages/env',
  'packages/common/packages/dom',
  'packages/common/packages/dom-helpers',
  'packages/common/packages/query',
  'packages/common/packages/raf',
  'packages/common/packages/security',
  'packages/common/packages/storage',
  'packages/common/packages/validate',
  'packages/common/packages/http',
  'packages/common/packages/keyboard',
  'packages/common/packages/a11y',
  'packages/common/packages/performance',
  'packages/common/packages/assertions',
  'packages/common/packages/async-scheduler',
  'packages/common/packages/event-normalizer',
  'packages/common/packages/node-cache',
  'packages/common/packages/render-queue',
  'packages/common/packages/transition-engine',
  'packages/common/packages/memory',
  'packages/common/packages/common',
  'packages/host-contract',

  // L1: 核心原语层
  'packages/reactivity',
  'packages/vdom',
  'packages/dom-runtime',
  'packages/compiler',

  // L2: 渲染引擎层
  'packages/component',
  'packages/renderer',
  'packages/adapter-web',
  'packages/dom',
  'packages/web',

  // L3: 核心框架层
  'packages/core',
  'packages/core-signal',
  'packages/core-vnode',

  // L4: 生态系统
  'packages/ecosystem/packages/router',
  'packages/ecosystem/packages/router-fs',
  'packages/ecosystem/packages/api',
  'packages/ecosystem/packages/store',
  'packages/ecosystem/packages/ssr',
  'packages/ecosystem/packages/compat',
  'packages/ecosystem/packages/devtools',
  'packages/ecosystem/packages/platform-adapter',
  'packages/ecosystem/packages/bundler',
  'packages/ecosystem/packages/hmr',
  'packages/ecosystem/packages/runtime-edge',

  // L5: UI 组件
  'packages/ecosystem/packages/ui',

  // L6: 插件系统
  'packages/plugins/packages/plugin-vite',
  'packages/plugins/packages/plugin-theme',
  'packages/plugins/packages/plugin-logger',
  'packages/plugins/packages/plugin-auth',
  'packages/plugins/packages/plugin-storage',
  'packages/plugins/packages/plugin-i18n',
  'packages/plugins/packages/plugin-form',
  'packages/plugins/packages/plugin-validation',
  'packages/plugins/packages/plugin-data',
  'packages/plugins/packages/plugin-data-fetch',
  'packages/plugins/packages/plugin-chart',
  'packages/plugins/packages/plugin-animation',
  'packages/plugins/packages/plugin-testing',

  // L7: 工具包
  'packages/tools/packages/cli',
  'packages/tools/packages/devtools',
  'packages/tools/packages/test-utils',
];

const rootDir = process.cwd();
const published = [];
const missing = [];
const failed = [];

console.log('📦 检查所有可发布包的 npm 状态...\n');
console.log(`共 ${publishOrder.length} 个包需要检查\n`);

let index = 1;
for (const pkgPath of publishOrder) {
  const fullPath = path.join(rootDir, pkgPath);
  const pkgJsonPath = path.join(fullPath, 'package.json');

  if (!fs.existsSync(pkgJsonPath)) {
    console.log(`[${index}/${publishOrder.length}] ⚠️  包不存在: ${pkgPath}`);
    failed.push(pkgPath);
    index++;
    continue;
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  const pkgName = pkgJson.name;
  const pkgVersion = pkgJson.version;

  try {
    // 检查 npm 上的最新版本
    const result = execSync(
      `npm view ${pkgName} version --registry=https://registry.npmjs.org/ 2>&1`,
      {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    const npmVersion = result.trim();

    if (npmVersion === pkgVersion) {
      console.log(`[${index}/${publishOrder.length}] ✅ ${pkgName}@${pkgVersion} - 已发布`);
      published.push({ path: pkgPath, name: pkgName, version: pkgVersion });
    } else {
      console.log(
        `[${index}/${publishOrder.length}] ⚠️  ${pkgName} - 本地: ${pkgVersion}, npm: ${npmVersion}`,
      );
      missing.push({ path: pkgPath, name: pkgName, localVersion: pkgVersion, npmVersion });
    }
  } catch (error) {
    const stderr = error.stderr?.toString() || error.message;
    if (stderr.includes('404') || stderr.includes('Not Found')) {
      console.log(`[${index}/${publishOrder.length}] ❌ ${pkgName} - 未在 npm 上找到`);
      missing.push({ path: pkgPath, name: pkgName, localVersion: pkgVersion, npmVersion: null });
    } else {
      console.log(
        `[${index}/${publishOrder.length}] ❌ ${pkgName} - 检查失败: ${stderr.substring(0, 100)}`,
      );
      failed.push({ path: pkgPath, name: pkgName, error: stderr });
    }
  }

  index++;
}

console.log('\n========================================');
console.log('📊 检查结果汇总\n');
console.log(`✅ 已发布 (${published.length}/${publishOrder.length}):`);
published.forEach((p) => console.log(`   - ${p.name}@${p.version}`));

console.log(`\n❌ 未找到或版本不匹配 (${missing.length}):`);
if (missing.length > 0) {
  missing.forEach((p) => {
    if (p.npmVersion) {
      console.log(`   - ${p.name}: 本地 ${p.localVersion}, npm ${p.npmVersion}`);
    } else {
      console.log(`   - ${p.name}: 未在 npm 上找到`);
    }
  });
} else {
  console.log('   无');
}

console.log(`\n⚠️  检查失败 (${failed.length}):`);
if (failed.length > 0) {
  failed.forEach((p) => console.log(`   - ${p.name}`));
} else {
  console.log('   无');
}

if (missing.length === 0 && failed.length === 0) {
  console.log('\n🎉 所有包都已正确发布！');
}
