/**
 * @lytjs/compiler - WASM Module Entry
 *
 * ⚠️⚠️ **重要：这不是 WebAssembly 实现**（2026-09-26 审计实测）
 *
 * 本目录（`src/wasm/`，4 文件 740 行）**不含任何 `WebAssembly` API 调用** ——
 * 它只是 `parse → transform → generate` 的 **JavaScript 包装层**，
 * 经 `@lytjs/compiler/wasm` 子路径对外暴露，**没有任何性能收益**。
 *
 * 此前本文件的措辞是「WASM-ready 编译器接口统一导出」，极易被读成
 * "已接入 WASM 加速"，故在此明确更正。详细自述见 `wasm-compiler.ts` 头部。
 *
 * 现状：功能可用（输出与主编译器一致），但**名不副实**。
 * 若确需 WASM 加速，需要真实的 wasm 模块 + 内存表 + 加载逻辑（尚未实现）；
 * 若不打算做，建议把本子路径从导出面与文档中移除，避免误导使用者。
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
