/**
 * Lyt.js 模板编译器 — 统一入口
 *
 * 提供完整的模板编译流程：parse → transform → optimize → generate
 * 以及所有子模块的统一导出。
 *
 * 使用示例：
 *   import { compile } from './compiler';
 *   const { code } = compile('<div class="app">{{ message }}</div>');
 *   // → h('div', { 'class': 'app' }, _ctx.message)
 *
 *   // 运行时使用：
 *   const renderFn = new Function('h', '_ctx', 'return ' + code);
 *   const vnode = renderFn(h, proxy);
 */

// ============================================================
// AST 节点定义
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

export {
  createPosition,
  createRootNode,
  createElementNode,
  createTextNode,
  createAttributeNode,
  createDirectiveNode,
} from './ast/nodes';

// ============================================================
// HTML 解析器
// ============================================================

import { parseHTML } from './parser/html-parser';

export { parseHTML };

// ============================================================
// AST 转换
// ============================================================

import { transform } from './transform/transform';
export { transform };
export type { TransformOptions, NodeTransform } from './transform/transform';
export { TransformContext } from './transform/transform';

// ============================================================
// 静态优化
// ============================================================

import { optimize, isStatic } from './transform/optimize';
export { optimize, isStatic };
export type { HoistResult } from './transform/optimize';

// ============================================================
// 静态提升 (Static Hoisting)
// ============================================================

import { analyzeStatic, isHoistableNode, generateHoistedDecls } from './transform-static-hoist';
export { analyzeStatic, isHoistableNode, generateHoistedDecls };
export type { HoistResult as StaticHoistResult } from './transform-static-hoist';

// ============================================================
// 补丁标记 (Patch Flags)
// ============================================================

import { CompilerPatchFlags, getPatchFlag, hasPatchFlag, describePatchFlag } from './patch-flags';
export { CompilerPatchFlags, getPatchFlag, hasPatchFlag, describePatchFlag };

// ============================================================
// 块树 (Block Tree)
// ============================================================

import {
  createBlock,
  createVNode,
  enterBlock,
  exitBlock,
  getCurrentBlock,
  trackDynamicChild,
  traverseBlockChildren,
  countDynamicChildren,
} from './block-tree';
export {
  createBlock,
  createVNode,
  enterBlock,
  exitBlock,
  getCurrentBlock,
  trackDynamicChild,
  traverseBlockChildren,
  countDynamicChildren,
};
export type { Block, VNode } from './block-tree';

// ============================================================
// 优化输出 (Optimize Output)
// ============================================================

import { optimizeOutput, generateImportDeclarations, getHelperImportName, getAllHelperNames } from './optimize-output';
export { optimizeOutput, generateImportDeclarations, getHelperImportName, getAllHelperNames };
export type { OptimizeOutputOptions, OptimizeOutputResult } from './optimize-output';

// ============================================================
// 代码生成
// ============================================================

import { generate } from './codegen/codegen';
export { generate };
export type { CodegenOptions, CodegenResult } from './codegen/codegen';

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
 *
 * @example
 *   const result = compile(`
 *     <div class="container">
 *       <h1 v-if="showTitle">{{ title }}</h1>
 *       <ul>
 *         <li v-each="item in items">{{ item.name }}</li>
 *       </ul>
 *       <input v-bind:model="inputValue" />
 *       <button @click="handleSubmit">Submit</button>
 *     </div>
 *   `);
 *
 *   console.log(result.code);
 *   // h('div', { 'class': 'container' }, [
 *   //   (_ctx.showTitle ? (h('h1', null, _ctx.title)) : null),
 *   //   h('ul', null, renderList(_ctx.items, (item) => h('li', null, _ctx.item.name))),
 *   //   h('input', { model: { value: _ctx.inputValue, callback: $event => _ctx.inputValue = $event } }),
 *   //   h('button', { 'onClick': _ctx.handleSubmit }, 'Submit')
 *   // ])
 *
 *   // 运行时使用：
 *   const renderFn = new Function('h', '_ctx', 'return ' + result.code);
 *   const vnode = renderFn(h, proxy);
 */
export function compile(template: string, options: CompileOptions = {}): CompileResult {
  // 阶段 1：解析 — 将模板字符串解析为 AST
  const ast = parseHTML(template);

  // 阶段 2：转换 — 对 AST 进行语义转换
  transform(ast, options.transform);

  // 阶段 3：优化 — 静态分析，标记静态子树
  const hoistResult = optimize(ast);

  // 阶段 4：代码生成 — 将 AST 转换为渲染函数代码
  const codegenResult = generate(ast, options.codegen);

  return {
    code: codegenResult.code,
    ast,
    hoistResult,
    helpers: codegenResult.helpers,
  };
}

// ============================================================
// SFC 单文件组件支持
// ============================================================

export { parseSFC, compileSFC, scopeCSS } from './sfc/index.ts';
export type { SFCDescriptor, SFCBlock, SFCStyleBlock, SFCCompileResult } from './sfc/index.ts';

// ============================================================
// WASM 模拟层 — 浏览器端编译器
// ============================================================

import { createWASMCompiler } from './wasm-compiler';
export { createWASMCompiler };
export type {
  WASMCompiler,
  WASMCompileOptions,
  WASMCompileResult,
  WASMCompileError,
  WASMCompileWarning,
  WASMTransformOptions,
  WASMGenerateOptions,
} from './wasm-compiler';

// ============================================================
// WASM 模拟层 — 浏览器优化的解析器
// ============================================================

import { tokenize, buildAST, parseInterpolation } from './wasm-parser';
export { tokenize, buildAST, parseInterpolation };
export type { Token, TokenLocation, Expression } from './wasm-parser';

// ============================================================
// WASM 模拟层 — 浏览器优化的代码生成器
// ============================================================

import {
  generateRenderCode,
  generateHoistedCode,
  generatePatchFlags,
} from './wasm-generator';
export { generateRenderCode, generateHoistedCode, generatePatchFlags };
export type { GenerateOptions as WASMGenerateOptionsInternal, HoistedCodeResult } from './wasm-generator';

// ============================================================
// WASM 模拟层 — Playground 集成助手
// ============================================================

import { createBrowserCompiler } from './wasm-playground';
export { createBrowserCompiler };
export type {
  BrowserCompiler,
  RenderFunction,
  CompilerStats,
} from './wasm-playground';
