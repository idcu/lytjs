#!/usr/bin/env tsx
/**
 * 验证构建脚本的包列表是否正确
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, readdirSync, statSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function findPackageJson(startPath: string, results: string[] = []): string[] {
  if (!statSync(startPath).isDirectory()) return results;
  const items = readdirSync(startPath);
  
  for (const item of items) {
    if (item.startsWith('.') || item === 'node_modules' || item === '_templates') continue;
    const fullPath = join(startPath, item);
    if (statSync(fullPath).isDirectory()) {
      findPackageJson(fullPath, results);
    } else if (item === 'package.json') {
      results.push(fullPath);
    }
  }
  
  return results;
}

// 读取 final-publish.ts 中的包列表
function getPublishPackages() {
  const publishPath = join(ROOT, 'scripts', 'final-publish.ts');
  const content = readFileSync(publishPath, 'utf8');
  
  // 简单解析包名
  const packageMatches = content.matchAll(/name:\s*['"](@lytjs\/[^'"]+)['"]/g);
  const packages = Array.from(packageMatches).map(m => m[1]);
  return packages;
}

// 读取 smart-build.ts 中的包列表
function getBuildPackages() {
  const buildPath = join(ROOT, 'scripts', 'smart-build.ts');
  const content = readFileSync(buildPath, 'utf8');
  
  // 简单解析包名
  const packageMatches = content.matchAll(/name:\s*['"](@lytjs\/[^'"]+)['"]/g);
  const packages = Array.from(packageMatches).map(m => m[1]);
  return packages;
}

// 获取实际存在的包
function getActualPackages() {
  const pkgFiles = findPackageJson(join(ROOT, 'packages'));
  const packages: string[] = [];
  
  for (const pkgFile of pkgFiles) {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));
    if (pkg.name && !pkg.private) {
      packages.push(pkg.name);
    }
  }
  
  return packages.sort();
}

function main() {
  console.log('📦 验证包列表...\n');
  console.log('='.repeat(80));
  
  const buildPackages = getBuildPackages();
  const publishPackages = getPublishPackages();
  const actualPackages = getActualPackages();
  
  console.log(`\n🔧 smart-build.ts 中的包: ${buildPackages.length} 个`);
  console.log(`📦 final-publish.ts 中的包: ${publishPackages.length} 个`);
  console.log(`📂 实际存在的包: ${actualPackages.length} 个`);
  
  // 检查差异
  const inBuildNotPublish = buildPackages.filter(p => !publishPackages.includes(p));
  const inPublishNotBuild = publishPackages.filter(p => !buildPackages.includes(p));
  const inActualNotBuild = actualPackages.filter(p => !buildPackages.includes(p));
  const inActualNotPublish = actualPackages.filter(p => !publishPackages.includes(p));
  
  console.log('\n' + '='.repeat(80));
  console.log('🔍 差异分析:');
  
  if (inBuildNotPublish.length > 0) {
    console.log(`\n❌ 在 smart-build.ts 但不在 final-publish.ts: (${inBuildNotPublish.length}个)`);
    inBuildNotPublish.forEach(p => console.log(`  - ${p}`));
  }
  
  if (inPublishNotBuild.length > 0) {
    console.log(`\n❌ 在 final-publish.ts 但不在 smart-build.ts: (${inPublishNotBuild.length}个)`);
    inPublishNotBuild.forEach(p => console.log(`  - ${p}`));
  }
  
  if (inActualNotBuild.length > 0) {
    console.log(`\n❌ 实际存在但不在 smart-build.ts: (${inActualNotBuild.length}个)`);
    inActualNotBuild.forEach(p => console.log(`  - ${p}`));
  }
  
  if (inActualNotPublish.length > 0) {
    console.log(`\n❌ 实际存在但不在 final-publish.ts: (${inActualNotPublish.length}个)`);
    inActualNotPublish.forEach(p => console.log(`  - ${p}`));
  }
  
  if (inBuildNotPublish.length === 0 && inPublishNotBuild.length === 0 && 
      inActualNotBuild.length === 0 && inActualNotPublish.length === 0) {
    console.log('\n✅ 所有包列表一致!');
  }
  
  console.log('\n' + '='.repeat(80));
  
  if (buildPackages.length !== actualPackages.length) {
    console.log(`\n⚠️ 包数量不匹配: 构建=${buildPackages.length}, 实际=${actualPackages.length}`);
  }
}

main().catch(console.error);
