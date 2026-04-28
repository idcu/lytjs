/**
 * Lyt.js 模板编译器 — 统一入口
 *
 * 提供完整的模板编译流程：parse → transform → optimize → generate
 *
 * 使用示例：
 *   import { compile } from './compiler';
 *   const { code } = compile('<div class="app">{{ message }}</div>');
 *   // → h('div', { 'class': 'app' }, _ctx.message)
 *
 *   // 运行时使用：
 *   const renderFn = new Function('h', '_ctx', 'return ' + code);
 *   const vnode = renderFn(h, proxy);
 *
 * 子路径导出（按需引入）：
 *   - @lytjs/compiler/sfc            — SFC 单文件组件支持
 *   - @lytjs/compiler/patch-flags    — 补丁标记工具
 *   - @lytjs/compiler/hoist          — 静态提升
 *   - @lytjs/compiler/optimize-output — 优化输出
 *   - @lytjs/compiler/wasm           — WASM 浏览器端编译器
 *   - @lytjs/compiler/block-tree     — 块树
 */

// ============================================================
// 内部依赖（用于 compile 函数）
// ============================================================

import { parseHTML } from './parser/html-parser';
import { transform } from './transform/transform';
import { optimize } from './transform/optimize';
import { generate } from './codegen/codegen';

// ============================================================
// AST 节点类型（仅导出类型，不影响运行时体积）
// ============================================================

export type {
  ASTNode,
  BaseNode,
  RootNode,
  ElementNode,
  TextNode,
  AttributeNode,
  DirectiveNode,
  Position,
} from './ast/nodes';

// ============================================================
// HTML 解析器
// ============================================================

export { parseHTML } from './parser/html-parser';

// ============================================================
// AST 转换
// ============================================================

export { transform } from './transform/transform';
export type { TransformOptions, NodeTransform } from './transform/transform';

// ============================================================
// 静态优化
// ============================================================

export { optimize, isStatic } from './transform/optimize';
export type { HoistResult } from './transform/optimize';

// ============================================================
// 补丁标记 (Patch Flags)
// ============================================================

export { CompilerPatchFlags } from './patch-flags';

// ============================================================
// 代码生成
// ============================================================

export { generate } from './codegen/codegen';
export type { CodegenOptions, CodegenResult } from './codegen/codegen';

// ============================================================
// SFC 单文件组件（已移至子路径 @lytjs/compiler/sfc）
// ============================================================

// 保留 re-export 以保持向后兼容性，tree-shaking 会移除未使用的导出
export { parseSFC, extractExportDefault } from './sfc/parse-sfc';
export type { SFCDescriptor, SFCBlock, SFCStyleBlock } from './sfc/parse-sfc';
export { compileSFC, scopeCSS } from './sfc/compile-sfc';
export type { SFCCompileResult } from './sfc/compile-sfc';

// ============================================================
// TypeScript 类型声明生成（已移至子路径 @lytjs/compiler/typescript）
// ============================================================

// 保留 re-export 以保持向后兼容性，tree-shaking 会移除未使用的导出
export { generateTypeDeclarations, generateDtsForLytFile, createTypePlugin } from './typescript';
export type { TypeGenerateOptions } from './typescript';

// ============================================================
// 编译选项
// ============================================================

/** 完整编译选项 */
export interface CompileOptions {
  /** 转换选项 */
  transform?: import('./transform/transform').TransformOptions;
  /** 代码生成选项 */
  codegen?: import('./codegen/codegen').CodegenOptions;
}

// ============================================================
// 完整编译流程
// ============================================================

/** 编译结果 */
export interface CompileResult {
  /** 生成的渲染函数代码 */
  code: string;
  /** AST 根节点（用于调试和高级用法） */
  ast: import('./ast/nodes').RootNode;
  /** 静态优化结果 */
  hoistResult: import('./transform/optimize').HoistResult;
  /** 需要导入的辅助函数列表 */
  helpers: string[];
}

/**
 * 完整编译流程
 *
 * 将模板字符串编译为渲染函数代码，经过以下四个阶段：
 *   1. parse    — 将模板字符串解析为 AST
 *   2. transform — 对 AST 进行语义转换（处理指令、标记动态节点）
 *   3. optimize  — 静态分析，标记静态子树，收集可提升节点
 *   4. generate  — 将 AST 转换为渲染函数代码字符串
 *
 * @param template 模板字符串
 * @param options 编译选项
 * @returns 编译结果
 */
export function compile(template: string, options: CompileOptions = {}): CompileResult {
  const ast = parseHTML(template);
  transform(ast, options.transform);
  const hoistResult = optimize(ast);
  const codegenResult = generate(ast, options.codegen);

  return {
    code: codegenResult.code,
    ast,
    hoistResult,
    helpers: codegenResult.helpers,
  };
}
