#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */

/**
 * 恢复 workspace 依赖脚本
 *
 * 用途：发布完成后，将所有依赖恢复为 workspace:* 形式
 *
 * 用法: node scripts/restore-workspace.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

function findPackageJsonFiles(dir) {
  const results = [];

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = join(dir, entry.name);
      const pkgJsonPath = join(fullPath, 'package.json');

      if (existsSync(pkgJsonPath)) {
        results.push(pkgJsonPath);
      }

      // 递归搜索子目录
      if (
        entry.name !== 'node_modules' &&
        entry.name !== 'dist' &&
        entry.name !== '.turbo' &&
        entry.name !== '_templates'
      ) {
        results.push(...findPackageJsonFiles(fullPath));
      }
    }
  }

  return results;
}

function main() {
  console.log('🔄 恢复 workspace 依赖...\n');

  // 处理所有包
  const pkgFiles = findPackageJsonFiles(join(process.cwd(), 'packages'));
  let updatedCount = 0;

  for (const pkgFile of pkgFiles) {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
    let modified = false;

    // 将 @lytjs/ 依赖恢复为 workspace:*
    const depFields = ['dependencies', 'devDependencies', 'peerDependencies'];
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
