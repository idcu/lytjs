#!/usr/bin/env node
/**
 * Lyt.js 纯净打包脚本
 * 生成完整的项目压缩包，用于分发
 */

import { createWriteStream, promises as fs } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// 需要排除的文件和目录
const EXCLUDES = [
  '.git',
  '.gitignore',
  '.github',
  '.c8rc',
  '.eslintrc.json',
  '.npmignore',
  '.npmrc',
  '.prettierignore',
  '.prettierrc',
  '.stackblitzrc',
  'node_modules',
  'dist',
  '.DS_Store',
  'Thumbs.db',
  'debug-hash.ts',
  'llms.txt',
  'llms-full.txt',
  'docs/.vitepress/cache',
  'docs/.vitepress/dist',
  'packages/*/dist',
  'packages/*/node_modules',
  'packages/*/*.tsbuildinfo',
  'benchmarks/js-framework-benchmark/node_modules',
  'benchmarks/js-framework-benchmark/dist',
  'examples/*/node_modules',
  'examples/*/dist',
  'test-app',
  'test-lytjs',
  'test-lytjs-fresh',
  'playground',
];

/**
 * 读取 package.json
 */
async function getPackageInfo() {
  const pkgPath = join(ROOT, 'package.json');
  const content = await fs.readFile(pkgPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * 创建压缩包
 */
async function createArchive(pkg) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `lytjs-${pkg.version}-${timestamp}.zip`;
  const outputPath = join(ROOT, filename);
  
  console.log(`📦 正在打包: ${filename}`);
  console.log(`📍 输出路径: ${outputPath}`);
  
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });
    
    output.on('close', () => {
      const bytes = archive.pointer();
      const mb = (bytes / (1024 * 1024)).toFixed(2);
      console.log(`✅ 打包完成! ${mb} MB`);
      console.log(`📁 文件: ${filename}`);
      resolve({ path: outputPath, size: bytes, filename });
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    archive.pipe(output);
    
    // 手动添加需要的目录和文件，更安全
    addDirectories(archive);
    
    archive.finalize();
  });
}

/**
 * 安全地添加目录到压缩包
 */
function addDirectories(archive) {
  // 总是包含的顶层内容
  archive.glob('*.md', { cwd: ROOT });
  archive.glob('*.json', { cwd: ROOT, ignore: ['package-lock.json'] });
  archive.glob('*.yaml', { cwd: ROOT });
  archive.glob('LICENSE', { cwd: ROOT });
  archive.glob('.gitignore', { cwd: ROOT });
  
  // packages 目录（排除 dist 和 node_modules）
  archive.glob('packages/**', {
    cwd: ROOT,
    ignore: [
      'packages/*/dist/**',
      'packages/*/node_modules/**',
      'packages/*/*.tsbuildinfo'
    ]
  });
  
  // docs 目录（排除缓存和构建）
  archive.glob('docs/**', {
    cwd: ROOT,
    ignore: [
      'docs/.vitepress/cache/**',
      'docs/.vitepress/dist/**'
    ]
  });
  
  // examples 目录（排除 node_modules 和 dist）
  archive.glob('examples/**', {
    cwd: ROOT,
    ignore: [
      'examples/*/node_modules/**',
      'examples/*/dist/**'
    ]
  });
  
  // benchmarks 目录
  archive.glob('benchmarks/**', {
    cwd: ROOT,
    ignore: [
      'benchmarks/js-framework-benchmark/node_modules/**',
      'benchmarks/js-framework-benchmark/dist/**'
    ]
  });
  
  // scripts 目录
  archive.glob('scripts/**', { cwd: ROOT });
  
  console.log('✅ 添加源码添加完成');
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始打包 Lyt.js...\n');
  
  try {
    const pkg = await getPackageInfo();
    
    console.log(`📋 项目: ${pkg.name}`);
    console.log(`📌 版本: ${pkg.version}`);
    console.log(`📅 时间: ${new Date().toISOString()}\n`);
    
    // 创建完整包
    const archive = await createArchive(pkg);
    
    console.log(`\n✨ 打包完成!`);
    console.log(`📁 文件: ${archive.filename}`);
    console.log(`📦 大小: ${(archive.size / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (err) {
    console.error('\n❌ 打包失败:', err);
    process.exit(1);
  }
}

main();
