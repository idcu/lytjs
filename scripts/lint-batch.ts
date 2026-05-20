#!/usr/bin/env node
 
/**
 * 分包执行 ESLint 检查，避免内存溢出
 *
 * 使用方法：
 *   pnpm lint:batch           # 检查所有包
 *   pnpm lint:batch --fix     # 自动修复
 *
 * 原理：
 *   将大型项目分成多个批次执行 ESLint，每批执行完毕后释放内存，
 *   避免一次性扫描所有文件导致 JavaScript heap out of memory 错误。
 */

import { execSync } from 'node:child_process';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const isFix = process.argv.includes('--fix');
const eslintCmd = isFix ? 'eslint . --fix' : 'eslint .';

const NODE_OPTIONS = '--max-old-space-size=4096';

const IGNORE_DIRS = ['node_modules', 'dist', 'lib', 'coverage', '.git', '.trae'];

function getSubdirectories(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((name) => {
        const fullPath = join(dir, name);
        return (
          statSync(fullPath).isDirectory() && !IGNORE_DIRS.includes(name) && !name.startsWith('.')
        );
      })
      .map((name) => join(dir, name));
  } catch {
    return [];
  }
}

function hasTsFiles(dir: string): boolean {
  try {
    const srcDir = join(dir, 'src');
    if (!existsSync(srcDir)) return true; // 如果没有 src 目录，仍然运行
    return true;
  } catch {
    return false;
  }
}

function runEslintOnDir(dir: string, label: string): boolean {
  if (!hasTsFiles(dir)) {
    console.log(`  Skipping: ${label} (no source files)`);
    return true;
  }
  console.log(`  Checking: ${label}`);
  try {
    execSync(eslintCmd, {
      cwd: dir,
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS },
    });
    return true;
  } catch {
    return false;
  }
}

const batches = [
  { name: 'common packages', dirs: getSubdirectories('packages/common/packages') },
  { name: 'reactivity', dirs: ['packages/reactivity'] },
  { name: 'vdom', dirs: ['packages/vdom'] },
  { name: 'component', dirs: ['packages/component'] },
  { name: 'renderer', dirs: ['packages/renderer'] },
  { name: 'core', dirs: ['packages/core'] },
  { name: 'adapter-web', dirs: ['packages/adapter-web'] },
  { name: 'dom', dirs: ['packages/dom'] },
  { name: 'web', dirs: ['packages/web'] },
  { name: 'dom-runtime', dirs: ['packages/dom-runtime'] },
  { name: 'compiler', dirs: ['packages/compiler'] },
  { name: 'ecosystem packages', dirs: getSubdirectories('packages/ecosystem/packages') },
  { name: 'plugins packages', dirs: getSubdirectories('packages/plugins/packages') },
  { name: 'tools packages', dirs: getSubdirectories('packages/tools/packages') },
];

let hasError = false;

console.log('🔍 Running ESLint in batches to avoid memory issues...\n');

for (const batch of batches) {
  if (batch.dirs.length === 0) continue;

  console.log(`\n📦 ${batch.name}`);
  console.log('─'.repeat(50));

  for (const dir of batch.dirs) {
    const fullPath = resolve(process.cwd(), dir);
    const label = dir
      .replace('packages/common/packages/', '')
      .replace('packages/ecosystem/packages/', '')
      .replace('packages/plugins/packages/', '')
      .replace('packages/tools/packages/', '')
      .replace('packages/', '');
    const success = runEslintOnDir(fullPath, label);
    if (!success) {
      hasError = true;
    }
  }
}

if (hasError) {
  console.log('\n❌ ESLint found issues. Please fix them.');
  process.exit(1);
} else {
  console.log('\n✅ All ESLint checks passed!');
  process.exit(0);
}
