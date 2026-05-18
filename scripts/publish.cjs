const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VERSION = '6.4.0';
const ROOT = process.cwd();

// 发布顺序 - 按依赖层级
const PACKAGES = [
  // L0: 基础工具包（无内部依赖）
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
  
  // L3: 核心框架层
  'packages/core',
  'packages/core-signal',
  'packages/core-vnode',
  'packages/dom',
  'packages/web',
  
  // L4: 生态系统
  'packages/ecosystem/packages/router',
  'packages/ecosystem/packages/store',
  'packages/ecosystem/packages/ssr',
  'packages/ecosystem/packages/compat',
  'packages/ecosystem/packages/devtools',
  'packages/ecosystem/packages/platform-adapter',
  'packages/ecosystem/packages/ui',
  
  // L5: 插件
  'packages/plugins/packages/plugin-vite',
  'packages/plugins/packages/plugin-theme',
  'packages/plugins/packages/plugin-logger',
  'packages/plugins/packages/plugin-auth',
  'packages/plugins/packages/plugin-storage',
  'packages/plugins/packages/plugin-i18n',
  
  // L6: 工具
  'packages/tools/packages/cli',
  'packages/tools/packages/devtools',
  'packages/tools/packages/test-utils',
];

function updatePackageVersion(pkgPath) {
  const pkgFile = path.join(ROOT, pkgPath, 'package.json');
  if (!fs.existsSync(pkgFile)) return null;
  
  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  
  if (pkg.private) {
    return { name: pkg.name, private: true };
  }
  
  if (pkg.version !== VERSION) {
    pkg.version = VERSION;
    fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
  }
  
  return { name: pkg.name, path: pkgPath, version: pkg.version };
}

function publishPackage(pkgInfo) {
  if (pkgInfo.private) {
    console.log(`⏭️  跳过私有包: ${pkgInfo.name}`);
    return true;
  }
  
  const fullPath = path.join(ROOT, pkgInfo.path);
  console.log(`\n📦 发布 ${pkgInfo.name}@${VERSION}...`);
  
  try {
    execSync('npm publish --access public', {
      cwd: fullPath,
      stdio: 'inherit',
      env: {
        ...process.env,
        npm_config_registry: 'https://registry.npmjs.org/',
      },
    });
    console.log(`✅ ${pkgInfo.name}@${VERSION} 发布成功！`);
    return true;
  } catch (error) {
    if (error.status === 409 || (error.stdout && error.stdout.toString().includes('already published'))) {
      console.log(`⚠️  ${pkgInfo.name}@${VERSION} 已存在，跳过`);
      return true;
    }
    console.error(`❌ ${pkgInfo.name}@${VERSION} 发布失败:`, error.message);
    return false;
  }
}

console.log('🚀 LytJS 快速发布脚本\n');

// 第一步：收集并更新所有包信息
console.log('📝 收集包信息并更新版本...\n');
const pkgInfos = [];
for (const p of PACKAGES) {
  const info = updatePackageVersion(p);
  if (info) pkgInfos.push(info);
}
console.log(`✅ 找到 ${pkgInfos.length} 个包\n`);

// 第二步：发布
console.log('🚀 开始发布...\n');
let successCount = 0;
let failCount = 0;
const failed = [];

for (const info of pkgInfos) {
  const ok = publishPackage(info);
  if (ok) successCount++;
  else {
    failCount++;
    failed.push(info.name);
  }
}

console.log('\n========================================');
console.log('📊 发布统计\n');
console.log(`✅ 成功: ${successCount}`);
console.log(`❌ 失败: ${failCount}`);

if (failed.length > 0) {
  console.log('\n❌ 失败的包:');
  failed.forEach((name) => console.log(`   - ${name}`));
}

console.log('\n🎉 任务完成！');
