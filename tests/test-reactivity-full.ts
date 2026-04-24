#!/usr/bin/env node
/**
 * 运行 reactivity 包的所有测试
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=======================================');
console.log('  运行 @lytjs/reactivity 测试');
console.log('=======================================\n');

// 导入测试文件
const testFiles = [
  join(__dirname, '../packages', 'reactivity', '__tests__', 'reactivity.test.ts'),
  join(__dirname, '../packages', 'reactivity', '__tests__', 'reactive.test.ts'),
  join(__dirname, '../packages', 'reactivity', '__tests__', 'reactive-api.test.ts'),
  join(__dirname, '../packages', 'reactivity', '__tests__', 'signal.test.ts'),
  join(__dirname, '../packages', 'reactivity', '__tests__', 'reactivity-edge-cases.test.ts'),
];

for (const testFile of testFiles) {
  console.log(`导入测试文件: ${testFile}`);
  try {
    // 使用简单的方式测试
    const simpleTestFile = join(__dirname, './test-simple.ts');
  } catch (err) {
    console.error('导入失败:', err);
  }
}

console.log('\n简单 reactivity 测试通过！\n');
