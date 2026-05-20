 
/**
 * 恢复 workspace 依赖脚本
 *
 * 用途：发布完成后，将所有依赖恢复为 workspace:* 形式
 *
 * 用法: pnpm tsx scripts/restore-workspace.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

import { findPackageJsonFiles } from './shared.js';

function main(): void {
  console.log('🔄 恢复 workspace 依赖...\n');

  // 处理所有包
  const pkgFiles = findPackageJsonFiles(join(ROOT, 'packages'));
  let updatedCount = 0;

  for (const pkgFile of pkgFiles) {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
    let modified = false;

    // 将 @lytjs/ 依赖恢复为 workspace:*
    const depFields = ['dependencies', 'devDependencies', 'peerDependencies'] as const;
    for (const field of depFields) {
      if (pkg[field]) {
        for (const [dep, version] of Object.entries(pkg[field])) {
          if (
            typeof version === 'string' &&
            dep.startsWith('@lytjs/') &&
            !version.startsWith('workspace:')
          ) {
            pkg[field][dep] = 'workspace:*';
            modified = true;
            console.log(`  恢复 ${pkg.name} 的 ${dep}: ${version} → workspace:*`);
          }
        }
      }
    }

    if (modified) {
      writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
      updatedCount++;
    }
  }

  console.log(`\n✅ 完成！共恢复了 ${updatedCount} 个包的 workspace 依赖。`);
}

main();
