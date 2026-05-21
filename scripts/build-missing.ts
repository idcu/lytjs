#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const packagesToBuild = ['packages/ecosystem/packages/router', 'packages/ecosystem/packages/ssr'];

console.log('📦 构建缺失的包...\n');

for (const pkgPath of packagesToBuild) {
  console.log(`🚀 构建 ${pkgPath}...`);
  try {
    const fullPath = join(ROOT, pkgPath);
    execSync('npx tsup', {
      cwd: fullPath,
      stdio: 'inherit',
    });
    console.log(`✅ ${pkgPath} 构建成功！\n`);
  } catch {
    console.log(`❌ ${pkgPath} 构建失败！\n`);
  }
}

console.log('✅ 构建完成！');
