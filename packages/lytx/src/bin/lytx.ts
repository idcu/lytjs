#!/usr/bin/env node
/**
 * @lytjs/lytx bin 入口
 *
 * 此文件是 lytx CLI 的命令行入口点，由 package.json 的 "bin" 字段引用。
 * 实际逻辑委托给 src/cli.ts 中的 main() 函数。
 */

import { parseArgs } from '../cli';

/**
 * CLI 入口函数
 */
async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);

  // 动态导入其他模块以避免循环依赖
  const { startDevServer, build, startPreviewServer } = await import('../cli');

  switch (parsed.command) {
    case 'dev':
      await startDevServer(parsed.rootDir, parsed.port || 3000, parsed.host || 'localhost');
      break;
    case 'build':
      await build(parsed.rootDir);
      break;
    case 'preview':
      await startPreviewServer(parsed.rootDir, parsed.port || 4173, parsed.host || 'localhost');
      break;
    default:
      console.error(`[LytX] 未知命令: ${parsed.command}`);
      console.error('[LytX] 可用命令: dev, build, preview');
      process.exit(1);
  }
}

run().catch((err) => {
  console.error('[LytX] CLI 错误:', err);
  process.exit(1);
});
