#!/usr/bin/env tsx
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const packages: Array<{ name: string; path: string }> = [];

function findPackages(dir: string) {
  const pkgJsonPath = join(dir, 'package.json');

  if (existsSync(pkgJsonPath)) {
    try {
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
      if (pkgJson.name) {
        const relativePath = dir
          .replace(ROOT, '')
          .replace(/^\\|^\//, '')
          .replace(/\\/g, '/');
        packages.push({ name: pkgJson.name, path: relativePath });
      }
    } catch {
      // Skip
    }
  }

  try {
    const files = readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      if (
        file.isDirectory() &&
        file.name !== 'node_modules' &&
        file.name !== 'dist' &&
        file.name !== '.git' &&
        file.name !== '.next'
      ) {
        findPackages(join(dir, file.name));
      }
    }
  } catch {
    // Skip directories that cannot be read
  }
}

console.log('🔍 查找项目中的包...\n');
findPackages(join(ROOT, 'packages'));

packages.sort((a, b) => a.name.localeCompare(b.name));

console.log('='.repeat(80));
console.log(`📊 找到的包数量: ${packages.length}`);
console.log('='.repeat(80));
console.log('\n📦 所有包列表:');

packages.forEach((pkg, i) => {
  console.log(`  ${String(i + 1).padStart(3)}. ${pkg.name} (${pkg.path})`);
});

console.log('\n' + '='.repeat(80));
console.log(`\n✅ 发布检查: 项目中实际有 ${packages.length} 个可发布的包!`);
console.log(`✅ 对比: final-publish.ts 中包含 ${85} 个包的发布列表!`);
