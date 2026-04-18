/**
 * @lytjs/compiler/wasm — WASM 编译器子路径入口
 *
 * 按需导入 WASM 编译器相关 API：
 *   import { createWASMCompiler, tokenize, buildAST, generateRenderCode, createBrowserCompiler } from '@lytjs/compiler/wasm'
 */

export { createWASMCompiler } from '../wasm-compiler'
export type {
  WASMCompiler,
  WASMCompileOptions,
  WASMCompileResult,
  WASMCompileError,
  WASMCompileWarning,
  WASMTransformOptions,
  WASMGenerateOptions,
} from '../wasm-compiler'

export { tokenize, buildAST, parseInterpolation } from '../wasm-parser'
export type { Token, TokenLocation, Expression } from '../wasm-parser'

export {
  generateRenderCode,
  generateHoistedCode,
  generatePatchFlags,
} from '../wasm-generator'
export type { GenerateOptions as WASMGenerateOptionsInternal, HoistedCodeResult } from '../wasm-generator'

export { createBrowserCompiler } from '../wasm-playground'
export type {
  BrowserCompiler,
  RenderFunction,
  CompilerStats,
} from '../wasm-playground'
