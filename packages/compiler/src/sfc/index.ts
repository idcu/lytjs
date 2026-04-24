/**
 * Lyt.js SFC 模块 — 统一入口
 *
 * 导出 SFC 解析和编译的所有公开 API。
 */

export { parseSFC, extractExportDefault } from './parse-sfc'
export type { SFCDescriptor, SFCBlock, SFCStyleBlock } from './parse-sfc'

export { compileSFC, scopeCSS } from './compile-sfc'
export type { SFCCompileResult } from './compile-sfc'
