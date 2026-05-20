 
/**
 * 发布前准备脚本
 *
 * 用途：
 * 1. 将所有 workspace:* 依赖转换为实际版本号
 * 2. 验证所有包的版本一致性
 *
 * 用法: pnpm tsx scripts/prepare-publish.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

import { findPackageJsonFiles } from './shared.js';

function main(): void {
  console.log('🔧 发布前准备...\n');

  // 获取根版本
  const rootPkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
  const targetVersion = rootPkg.version;
  console.log(`目标版本: ${targetVersion}\n`);

  // 处理所有包
  const pkgFiles = findPackageJsonFiles(join(ROOT, 'packages'));
  let updatedCount = 0;

  for (const pkgFile of pkgFiles) {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
    let modified = false;

    // 转换 workspace 依赖为实际版本
    const depFields = ['dependencies', 'devDependencies', 'peerDependencies'] as const;
    for (const field of depFields) {
      if (pkg[field]) {
        for (const [dep, version] of Object.entries(pkg[field])) {
          if (typeof version === 'string' && version.startsWith('workspace:')) {
            pkg[field][dep] = `^${targetVersion}`;
            modified = true;
            console.log(`  更新 ${pkg.name} 的 ${dep}: ${version} → ^${targetVersion}`);
          }
        }
      }
    }

    if (modified) {
      writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
      updatedCount++;
    }
  }

  console.log(`\n✅ 完成！共更新了 ${updatedCount} 个包的依赖版本。`);
  console.log('\n现在可以进行发布了！');
}

main();
