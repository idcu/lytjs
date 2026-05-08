export { wasmCompile, serializeAST } from './wasm';
export { tokenize, buildAST, parseInterpolation } from './wasm';
export { generateRenderCode, generateHoistedCode, generatePatchFlags } from './wasm';
export type {
  WASMCompileOptions,
  WASMCompileResult,
  WASMCompileError,
  WASMCompileWarning,
  WASMTransformOptions,
  WASMGenerateOptions,
  ASTNode,
  Token,
} from './wasm';
