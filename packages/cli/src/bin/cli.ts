#!/usr/bin/env node
/**
 * @lytjs/cli bin 入口
 *
 * 此文件是 CLI 的命令行入口点，由 package.json 的 "bin" 字段引用。
 * 实际逻辑委托给 src/index.ts 中的 main() 函数。
 */

// 直接导入并执行 CLI 主模块
// src/index.ts 中已包含 shebang 和 main() 调用
import '../index';
