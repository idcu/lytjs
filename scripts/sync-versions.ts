 
/**
 * 版本同步脚本
 *
 * 用途：将所有子仓库/孙仓库的版本号同步为根 package.json 中的版本号。
 * 同时更新所有 workspace:* 依赖的引用。
 *
 * 用法: pnpm run sync-versions [--version <新版本号>]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

import { findPackageJsonFiles } from './shared.js';

function getRootVersion(): string {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
  return pkg.version;
}

function syncVersions(targetVersion: string): void {
  console.log(`🔄 同步所有包版本到 ${targetVersion}...\n`);

  const pkgFiles = findPackageJsonFiles(join(ROOT, 'packages'));
  let updatedCount = 0;

  for (const pkgFile of pkgFiles) {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
    const oldVersion = pkg.version;

    if (oldVersion !== targetVersion) {
      pkg.version = targetVersion;
      updatedCount++;
      console.log(`  📝 ${pkg.name}: ${oldVersion} → ${targetVersion}`);
    }

    // 更新 workspace 依赖的版本号（如果有显式版本）
    const depFields = ['dependencies', 'devDependencies', 'peerDependencies'] as const;
    for (const field of depFields) {
      if (pkg[field]) {
        for (const [dep, version] of Object.entries(pkg[field])) {
          if (typeof version === 'string' && version.startsWith('workspace:')) {
            // workspace:* 保持不变，workspace:^X.Y.Z 需要更新
            if (version !== 'workspace:*') {
              const semverPart = version.replace('workspace:', '');
              // 如果是精确版本号，更新为新版本
              if (/^\d+\.\d+\.\d+$/.test(semverPart)) {
                pkg[field][dep] = `workspace:^${targetVersion}`;
                console.log(`  📝 ${pkg.name}: ${dep} ${version} → workspace:^${targetVersion}`);
              }
            }
          }
        }
      }
    }

    writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  }

  // 更新根 package.json
  const rootPkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
  if (rootPkg.version !== targetVersion) {
    rootPkg.version = targetVersion;
    writeFileSync(join(ROOT, 'package.json'), JSON.stringify(rootPkg, null, 2) + '\n', 'utf-8');
    console.log(`  📝 根 package.json: → ${targetVersion}`);
  }

  console.log(`\n✅ 完成！共更新 ${updatedCount} 个包的版本号。`);
}

function main(): void {
  // 解析命令行参数
  const args = process.argv.slice(2);
  let targetVersion = getRootVersion();

  const versionIndex = args.indexOf('--version');
  if (versionIndex !== -1 && args[versionIndex + 1]) {
    targetVersion = args[versionIndex + 1];
  }

  // 验证版本号格式
  if (!/^\d+\.\d+\.\d+(-\w+\.\d+)?$/.test(targetVersion)) {
    console.error(`❌ 无效的版本号格式: ${targetVersion}`);
    console.error('   期望格式: X.Y.Z 或 X.Y.Z-prerelease.N');
    process.exit(1);
  }

  syncVersions(targetVersion);
}

main();
