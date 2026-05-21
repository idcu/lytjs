#!/usr/bin/env tsx
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPackageJsonFiles } from './shared.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const pkgFiles = findPackageJsonFiles(join(ROOT, 'packages'));
const success: string[] = [];
const failed: string[] = [];

console.log('\n📦 检查包构建状态...\n');

for (const pkgFile of pkgFiles) {
  const pkgDir = dirname(pkgFile);
  const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
  const hasDist = existsSync(join(pkgDir, 'dist'));
  const hasIndexJs = existsSync(join(pkgDir, 'dist', 'index.mjs'));
  const hasIndexCjs = existsSync(join(pkgDir, 'dist', 'index.cjs'));
  const _hasIndexDts = existsSync(join(pkgDir, 'dist', 'index.d.ts'));

  if (hasDist && (hasIndexJs || hasIndexCjs)) {
    success.push(pkg.name);
  } else {
    failed.push(pkg.name);
  }
}

console.log(`✅ 成功构建: ${success.length} 个`);
console.log(`❌ 构建失败: ${failed.length} 个\n`);

console.log('✅ 成功的包:');
success.sort().forEach((name) => console.log(`  - ${name}`));

console.log('\n❌ 失败的包:');
failed.sort().forEach((name) => console.log(`  - ${name}`));

console.log('\n💡 下一步建议:');
console.log('  可以考虑只发布成功构建的包，或者继续修复失败的包。');
