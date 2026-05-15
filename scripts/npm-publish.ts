/**
 * NPM 发布脚本
 *
 * 用途：按依赖层级系统化发布所有 @lytjs/ 包到 npm
 *
 * 使用方式：
 * 1. 确保 .npmrc_for_publish 文件包含 npm token
 * 2. 运行: pnpm tsx scripts/npm-publish.ts
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const NPMRC_PATH = join(process.cwd(), '.npmrc_for_publish');
const DRY_RUN = process.argv.includes('--dry-run');

if (!existsSync(NPMRC_PATH)) {
  console.error('❌ 错误：找不到 .npmrc_for_publish 文件');
  console.error('   请确保该文件包含你的 npm token');
  process.exit(1);
}

function publishPackage(pkgPath: string): boolean {
  const pkg = JSON.parse(readFileSync(join(pkgPath, 'package.json'), 'utf-8'));
  const pkgName = pkg.name;
  const version = pkg.version;

  console.log(`\n📦 发布 ${pkgName}@${version}...`);

  if (DRY_RUN) {
    console.log(`   [DRY RUN] 跳过实际发布`);
    return true;
  }

  try {
    execSync(`npm publish --access public --registry https://registry.npmjs.org/`, {
      cwd: pkgPath,
      stdio: 'inherit',
      env: {
        ...process.env,
        npm_config_registry: 'https://registry.npmjs.org/',
      },
    });
    console.log(`✅ ${pkgName}@${version} 发布成功！`);
    return true;
  } catch (error: any) {
    if (error.status === 409) {
      console.log(`⚠️  ${pkgName}@${version} 已存在，跳过`);
      return true;
    }
    console.error(`❌ ${pkgName}@${version} 发布失败: ${error.message}`);
    return false;
  }
}

// 发布顺序定义（按依赖层级）
const PUBLISH_ORDER = [
  // L0: 基础工具层
  'packages/common/packages/shared-types',
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

  // L4: 生态系统
  'packages/ecosystem/packages/router',
  'packages/ecosystem/packages/store',
  'packages/ecosystem/packages/ssr',
  'packages/ecosystem/packages/compat',
  'packages/ecosystem/packages/devtools',
  'packages/ecosystem/packages/platform-adapter',

  // L5: UI 组件
  'packages/ecosystem/packages/ui',

  // L6: 插件系统
  'packages/plugins/packages/plugin-vite',
  'packages/plugins/packages/plugin-theme',
  'packages/plugins/packages/plugin-logger',
  'packages/plugins/packages/plugin-auth',
  'packages/plugins/packages/plugin-storage',
  'packages/plugins/packages/plugin-i18n',
  'packages/plugins/packages/plugin-chart',

  // L5: 工具包
  'packages/tools/packages/cli',
  'packages/tools/packages/devtools',
  'packages/tools/packages/test-utils',
];

function main(): void {
  console.log('🚀 LytJS NPM 发布脚本\n');
  console.log(`模式: ${DRY_RUN ? 'DRY RUN（不实际发布）' : '生产模式'}`);
  console.log(`Token: ${existsSync(NPMRC_PATH) ? '已配置' : '未配置'}\n`);

  let successCount = 0;
  let failCount = 0;
  const failedPackages: string[] = [];

  for (const pkgPath of PUBLISH_ORDER) {
    const fullPath = join(process.cwd(), pkgPath);

    if (!existsSync(fullPath)) {
      console.log(`⚠️  跳过不存在的包: ${pkgPath}`);
      continue;
    }

    const success = publishPackage(fullPath);
    if (success) {
      successCount++;
    } else {
      failCount++;
      const pkg = JSON.parse(readFileSync(join(fullPath, 'package.json'), 'utf-8'));
      failedPackages.push(pkg.name);
    }
  }

  console.log('\n========================================');
  console.log('📊 发布统计\n');
  console.log(`✅ 成功: ${successCount}`);
  console.log(`❌ 失败: ${failCount}`);

  if (failedPackages.length > 0) {
    console.log('\n❌ 失败的包:');
    failedPackages.forEach((pkg) => console.log(`   - ${pkg}`));
  }

  if (!DRY_RUN) {
    console.log('\n🎉 发布完成！');
    console.log('\n⚠️  重要提醒：');
    console.log('   请运行以下命令恢复 workspace 依赖：');
    console.log('   pnpm tsx scripts/restore-workspace.ts');
    console.log('   pnpm install');
  }
}

main();
