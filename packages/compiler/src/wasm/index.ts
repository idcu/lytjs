/**
 * @lytjs/compiler - WASM Module Entry
 * WASM-ready 编译器接口统一导出。
 */

// 主编译函数
export { wasmCompile, serializeAST } from './wasm-compiler';

// Parser 接口
export { tokenize, buildAST, parseInterpolation } from './wasm-parser';

// Generator 接口
export { generateRenderCode, generateHoistedCode, generatePatchFlags } from './wasm-generator';

// 类型导出
export type {
  WASMCompileOptions,
  WASMCompileResult,
  WASMCompileError,
  WASMCompileWarning,
  WASMTransformOptions,
  WASMGenerateOptions,
  ASTNode,
  Token,
} from './wasm-compiler';
