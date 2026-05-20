import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const VERSION = '6.4.0';
const ROOT = process.cwd();

const PUBLISH_ORDER = [
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
  'packages/reactivity',
  'packages/vdom',
  'packages/dom-runtime',
  'packages/compiler',
  'packages/component',
  'packages/renderer',
  'packages/adapter-web',
  'packages/core',
  'packages/core-signal',
  'packages/core-vnode',
  'packages/dom',
  'packages/web',
  'packages/ecosystem/packages/router',
  'packages/ecosystem/packages/store',
  'packages/ecosystem/packages/ssr',
  'packages/ecosystem/packages/compat',
  'packages/ecosystem/packages/devtools',
  'packages/ecosystem/packages/platform-adapter',
  'packages/ecosystem/packages/ui',
  'packages/plugins/packages/plugin-vite',
  'packages/plugins/packages/plugin-theme',
  'packages/plugins/packages/plugin-logger',
  'packages/plugins/packages/plugin-auth',
  'packages/plugins/packages/plugin-storage',
  'packages/plugins/packages/plugin-i18n',
  'packages/tools/packages/cli',
  'packages/tools/packages/devtools',
  'packages/tools/packages/test-utils',
];

function updateVersion(pkgPath) {
  const pkgFile = join(ROOT, pkgPath, 'package.json');
  if (!existsSync(pkgFile)) return;

  const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));

  if (pkg.version !== VERSION) {
    console.log(`🔄 更新 ${pkg.name}: ${pkg.version} -> ${VERSION}`);
    pkg.version = VERSION;
    writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
  }
}

function publishPackage(pkgPath) {
  const fullPath = join(ROOT, pkgPath);
  const pkgFile = join(fullPath, 'package.json');

  if (!existsSync(pkgFile)) {
    console.log(`⚠️  跳过: ${pkgPath} (不存在)`);
    return true;
  }

  const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
  const pkgName = pkg.name;
  const version = pkg.version;

  if (pkg.private) {
    console.log(`⏭️  跳过私有包: ${pkgName}`);
    return true;
  }

  console.log(`\n📦 发布 ${pkgName}@${version}...`);

  try {
    execSync('npm publish --access public', {
      cwd: fullPath,
      stdio: 'inherit',
      env: {
        ...process.env,
        npm_config_registry: 'https://registry.npmjs.org/',
      },
    });
    console.log(`✅ ${pkgName}@${version} 发布成功！`);
    return true;
  } catch (error) {
    if (error.status === 409 || (error.stdout && error.stdout.includes('already published'))) {
      console.log(`⚠️  ${pkgName}@${version} 已存在，跳过`);
      return true;
    }
    console.error(`❌ ${pkgName}@${version} 发布失败:`, error.message);
    return false;
  }
}

console.log('🚀 LytJS 发布脚本 v1.0\n');

// 第一步：更新所有包的版本
console.log('📝 开始更新版本...\n');
for (const pkgPath of PUBLISH_ORDER) {
  updateVersion(pkgPath);
}
console.log('\n✅ 版本更新完成！\n');

// 第二步：按顺序发布
console.log('🚀 开始发布...');
let success = 0;
let failed = 0;
const failedPkgs = [];

for (const pkgPath of PUBLISH_ORDER) {
  const ok = publishPackage(pkgPath);
  if (ok) success++;
  else {
    failed++;
    const pkgFile = join(ROOT, pkgPath, 'package.json');
    if (existsSync(pkgFile)) {
      const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
      failedPkgs.push(pkg.name);
    }
  }
}

console.log('\n========================================');
console.log('📊 发布总结\n');
console.log(`✅ 成功: ${success}`);
console.log(`❌ 失败: ${failed}`);
if (failedPkgs.length > 0) {
  console.log('\n❌ 失败的包:');
  failedPkgs.forEach((p) => console.log(`   - ${p}`));
}
console.log('\n🎉 任务完成！');
