/**
 * 循环依赖检测脚本
 *
 * 使用 madge 检测所有包的循环依赖。
 *
 * 用法: pnpm run check-circular
 *       pnpm run check-circular:src  (扫描源码)
 */

import madge from 'madge';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const isSrc = process.argv.includes('--src');

interface PackageEntry {
  name: string;
  path: string;
}

function collectPackages(): PackageEntry[] {
  const packages: PackageEntry[] = [];
  const packagesDir = join(ROOT, 'packages');

  // 顶层包
  const topDirs = readdirSync(packagesDir, { withFileTypes: true });
  for (const dir of topDirs) {
    if (!dir.isDirectory()) continue;
    if (dir.name.startsWith('_') || dir.name === 'common' || dir.name === 'lytui') continue;

    const entryFile = isSrc
      ? join(packagesDir, dir.name, 'src', 'index.ts')
      : join(packagesDir, dir.name, 'dist', 'index.mjs');

    if (existsSync(entryFile)) {
      packages.push({ name: `@lytjs/${dir.name}`, path: entryFile });
    }
  }

  // 孙包目录
  const subDirs = [
    'common/packages',
    'common/common-warn',
    'ecosystem/packages',
    'plugins/packages',
    'tools/packages',
  ];
  for (const sub of subDirs) {
    const subPath = join(packagesDir, sub);
    if (!existsSync(subPath)) continue;

    const dirs = readdirSync(subPath, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;

      const entryFile = isSrc
        ? join(subPath, dir.name, 'src', 'index.ts')
        : join(subPath, dir.name, 'dist', 'index.mjs');

      if (existsSync(entryFile)) {
        packages.push({ name: `@lytjs/${dir.name}`, path: entryFile });
      }
    }
  }

  return packages;
}

async function main(): Promise<void> {
  console.log(`🔍 检查循环依赖 (${isSrc ? '源码模式' : '构建模式'})...\n`);

  const packages = collectPackages();

  if (packages.length === 0) {
    console.log('⚠️  未找到任何包入口文件。');
    console.log(isSrc ? '请确保 src/index.ts 文件存在。' : '请先运行 pnpm build。');
    process.exit(1);
  }

  console.log(`扫描到 ${packages.length} 个包，逐个检查中...\n`);

  const allCircular: string[][] = [];

  for (const pkg of packages) {
    try {
      console.log(`📦 检查 ${pkg.name}...`);

      const result = await madge(pkg.path, {
        fileExtensions: ['ts', 'js', 'mjs', 'cjs'],
        tsConfig: join(ROOT, 'tsconfig.base.json'),
        alias: {
          '@lytjs/*': join(ROOT, 'packages/*').replace(/\\/g, '/'),
        },
      });

      const circular = result.circular();
      if (circular.length > 0) {
        console.log(`   ❌ 发现 ${circular.length} 个循环依赖`);
        for (const cycle of circular) {
          allCircular.push(cycle);
        }
      } else {
        console.log(`   ✅ 无循环依赖`);
      }
    } catch (err) {
      console.warn(`   ⚠️  跳过 ${pkg.name}: ${(err as Error).message}`);
    }
  }

  console.log('\n========================================');

  if (allCircular.length === 0) {
    console.log('✅ 所有包均未发现循环依赖。\n');
    process.exit(0);
  }

  console.log(`❌ 发现 ${allCircular.length} 个循环依赖：\n`);

  for (const cycle of allCircular) {
    console.log(`  🔄 ${cycle.join(' → ')}`);
  }

  console.log('\n请重构以上模块以消除循环依赖。');
  process.exit(1);
}

main();
