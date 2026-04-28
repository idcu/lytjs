#!/usr/bin/env node
/**
 * @lytjs/cli bin 入口
 *
 * 此文件是 CLI 的命令行入口点，由 package.json 的 "bin" 字段引用。
 * 使用 void 表达式确保 esbuild tree-shaking 不会移除此导入。
 */

// 使用 void 表达式防止 tree-shaking 移除导入（sideEffects: false 时 bare import 会被忽略）
void import('../index');
