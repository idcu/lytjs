#!/usr/bin/env tsx
/**
 * 统一版本管理脚本 - 支持类似 tsconfig 的 extends 概念
 *
 * 用途：
 * 1. 更新所有包的版本号（统一版本）
 * 2. 更新所有依赖的版本号
 * 3. 支持批量更新外部依赖版本
 *
 * 用法:
 *   pnpm tsx scripts/update-versions.ts --version 7.0.0              # 更新所有包版本
 *   pnpm tsx scripts/update-versions.ts --dep react --version 19.0.0 # 更新某个依赖的版本
 *   pnpm tsx scripts/update-versions.ts --list                        # 查看当前版本信息
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

import { findPackageJsonFiles } from './shared.js';

interface VersionInfo {
  name: string;
  version: string;
  path: string;
}

function listVersions(): void {
  console.log('\n📦 当前所有包的版本：\n');
  const pkgFiles = findPackageJsonFiles(join(ROOT, 'packages'));
  const versions: VersionInfo[] = [];

  for (const pkgFile of pkgFiles) {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
    versions.push({
      name: pkg.name,
      version: pkg.version || '(未设置)',
      path: pkgFile,
    });
  }

  // 按名称排序
  versions.sort((a, b) => a.name.localeCompare(b.name));
  versions.forEach((v) => console.log(`  ${v.name.padEnd(35)} ${v.version}`));

  // 统计
  const uniqueVersions = [...new Set(versions.map((v) => v.version))];
  console.log(`\n📊 共 ${versions.length} 个包，${uniqueVersions.length} 个不同版本`);
}

function updateAllPackageVersions(targetVersion: string): void {
  console.log(`\n🔄 更新所有包版本到 ${targetVersion}...\n`);

  const pkgFiles = findPackageJsonFiles(join(ROOT, 'packages'));
  let updatedCount = 0;

  for (const pkgFile of pkgFiles) {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
    const oldVersion = pkg.version || '(未设置)';

    if (oldVersion !== targetVersion) {
      pkg.version = targetVersion;
      writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
      console.log(`  ✅ ${pkg.name}: ${oldVersion} → ${targetVersion}`);
      updatedCount++;
    }
  }

  // 更新根 package.json
  const rootPkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
  if (rootPkg.version !== targetVersion) {
    rootPkg.version = targetVersion;
    writeFileSync(join(ROOT, 'package.json'), JSON.stringify(rootPkg, null, 2) + '\n', 'utf-8');
    console.log(`  ✅ 根 package.json: ${rootPkg.version} → ${targetVersion}`);
    updatedCount++;
  }

  console.log(`\n✅ 完成！共更新 ${updatedCount} 个包的版本号。`);
}

function updateDependencyVersion(depName: string, newVersion: string): void {
  console.log(`\n🔄 更新依赖 ${depName} 到版本 ${newVersion}...\n`);

  const allPkgFiles = [join(ROOT, 'package.json'), ...findPackageJsonFiles(join(ROOT, 'packages'))];
  let updatedCount = 0;

  for (const pkgFile of allPkgFiles) {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
    let modified = false;
    const depFields = ['dependencies', 'devDependencies', 'peerDependencies'] as const;

    for (const field of depFields) {
      if (pkg[field] && pkg[field][depName]) {
        const oldVersion = pkg[field][depName];
        if (oldVersion !== newVersion) {
          pkg[field][depName] = newVersion;
          modified = true;
          console.log(
            `  ✅ ${pkg.name || '(根)'} [${field}]: ${depName} ${oldVersion} → ${newVersion}`,
          );
        }
      }
    }

    if (modified) {
      writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
      updatedCount++;
    }
  }

  if (updatedCount === 0) {
    console.log(`  ℹ️ 未找到依赖 ${depName}`);
  } else {
    console.log(`\n✅ 完成！共在 ${updatedCount} 个包中更新了依赖 ${depName}。`);
  }
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    listVersions();
    return;
  }

  const versionIndex = args.indexOf('--version');
  const depIndex = args.indexOf('--dep');

  if (depIndex !== -1 && args[depIndex + 1] && versionIndex !== -1 && args[versionIndex + 1]) {
    // 更新特定依赖的版本
    const depName = args[depIndex + 1];
    const newVersion = args[versionIndex + 1];
    updateDependencyVersion(depName, newVersion);
  } else if (versionIndex !== -1 && args[versionIndex + 1]) {
    // 更新所有包的版本
    const targetVersion = args[versionIndex + 1];
    if (!/^\d+\.\d+\.\d+(-\w+\.\d+)?$/.test(targetVersion)) {
      console.error(`❌ 无效的版本号格式: ${targetVersion}`);
      console.error('   期望格式: X.Y.Z 或 X.Y.Z-prerelease.N');
      process.exit(1);
    }
    updateAllPackageVersions(targetVersion);
  } else {
    console.log(`
📦 LytJS 统一版本管理工具

用法:
  # 查看当前所有包的版本
  pnpm tsx scripts/update-versions.ts --list

  # 更新所有包的版本号（统一版本）
  pnpm tsx scripts/update-versions.ts --version 7.0.0

  # 更新某个依赖的版本（所有包中）
  pnpm tsx scripts/update-versions.ts --dep react --version 19.0.0
`);
  }
}

main();
