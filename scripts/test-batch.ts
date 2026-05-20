#!/usr/bin/env node
/**
 * 分包执行 Vitest 测试，避免内存溢出
 *
 * 使用方法：
 *   pnpm test:batch           # 测试所有包
 *   pnpm test:batch --fix     # 测试并修复（如适用）
 *
 * 原理：
 *   将大型项目的测试分成多个批次执行，每批执行完毕后释放内存，
 *   避免一次性运行所有测试导致 JavaScript heap out of memory 错误。
 */

import { execSync } from 'node:child_process';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const isFix = process.argv.includes('--fix');
const testCmd = isFix ? 'vitest run --fix' : 'vitest run';
const NODE_OPTIONS = '--max-old-space-size=4096';

const IGNORE_DIRS = [
  'node_modules',
  'dist',
  'lib',
  'coverage',
  '.git',
  '.trae',
  'e2e',
  'playground',
];

function getTestDirectories(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((name) => {
        const fullPath = join(dir, name);
        const stat = statSync(fullPath);
        if (!stat.isDirectory()) return false;
        if (IGNORE_DIRS.includes(name)) return false;
        if (name.startsWith('.')) return false;
        // 检查是否有 tests 目录
        const testsDir = join(fullPath, 'tests');
        return existsSync(testsDir);
      })
      .map((name) => join(dir, name));
  } catch {
    return [];
  }
}

function runTestOnPackage(dir: string, label: string): boolean {
  const testsDir = join(dir, 'tests');
  if (!existsSync(testsDir)) {
    console.log(`  Skipping: ${label} (no tests directory)`);
    return true;
  }

  console.log(`  Testing: ${label}`);
  try {
    execSync(testCmd, {
      cwd: dir,
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS },
    });
    return true;
  } catch {
    return false;
  }
}

const testBatches = [
  { name: 'common packages', packages: getTestDirectories('packages/common/packages') },
  { name: 'reactivity', packages: ['packages/reactivity'] },
  { name: 'vdom', packages: ['packages/vdom'] },
  { name: 'component', packages: ['packages/component'] },
  { name: 'renderer', packages: ['packages/renderer'] },
  {
    name: 'core packages',
    packages: ['packages/core', 'packages/core-signal', 'packages/core-vnode'],
  },
  { name: 'adapter packages', packages: ['packages/adapter-web', 'packages/dom', 'packages/web'] },
  { name: 'dom-runtime', packages: ['packages/dom-runtime'] },
  { name: 'compiler', packages: ['packages/compiler'] },
];

let hasError = false;

console.log('🧪 Running Vitest in batches to avoid memory issues...\n');

for (const batch of testBatches) {
  if (batch.packages.length === 0) continue;

  console.log(`\n📦 ${batch.name}`);
  console.log('─'.repeat(50));

  for (const pkg of batch.packages) {
    const fullPath = resolve(process.cwd(), pkg);
    const label = pkg.replace('packages/', '');
    const success = runTestOnPackage(fullPath, label);
    if (!success) {
      hasError = true;
    }
  }
}

if (hasError) {
  console.log('\n❌ Some tests failed. Please fix them.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
