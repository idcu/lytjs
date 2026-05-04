// src/index.ts
// @lytjs/compiler - Main entry point
// Re-exports all public APIs

// Compile function
import { parse } from './parser';
import { transform, builtInTransforms, builtInDirectiveTransforms, optimize } from './transform';
import { generate } from './codegen';
import { generateSignal } from './codegen-signal';
import { generateSSR } from './codegen-ssr';
import type { CompilerOptions, CodegenResult, DirectiveTransform } from './types';

export { parse, transform, optimize, generate };

// ============================================================
// LRU 编译缓存
// ============================================================

/** LRU 缓存条目 */
interface CompileCacheEntry {
  code: string;
  preamble: string;
  ast: any;
}

/** 最大缓存条目数 */
const MAX_CACHE_SIZE = 100;

/** 编译缓存（Map 天然保持插入顺序，用于 LRU 淘汰） */
const compileCache = new Map<string, CompileCacheEntry>();

/**
 * 简单的字符串哈希函数（djb2），用于生成缓存键。
 * 不需要加密安全性，仅需良好的分布性。
 */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return String(hash >>> 0);
}

/**
 * 构建编译缓存键，确保读取和写入使用相同的键生成逻辑。
 * 包含 source、ssrMode、rendererMode 三个维度。
 */
function buildCompileCacheKey(source: string, options: CompilerOptions): string {
  return hashString(
    source + '|' + String(options.ssrMode ?? false) + '|' + String(options.rendererMode ?? ''),
  );
}

/**
 * 清除编译缓存。用于测试或需要释放内存时。
 */
export function clearCompileCache(): void {
  compileCache.clear();
}

/**
 * 获取当前编译缓存大小。用于调试和测试。
 */
export function getCompileCacheSize(): number {
  return compileCache.size;
}

export function compile(source: string, options: CompilerOptions = {}): CodegenResult {
  // 0. 检查编译缓存（仅在无自定义 nodeTransforms/directiveTransforms 时使用缓存）
  const hasCustomTransforms =
    (options.nodeTransforms && options.nodeTransforms.length > 0) ||
    (options.directiveTransforms && Object.keys(options.directiveTransforms).length > 0);

  if (!hasCustomTransforms) {
    const cacheKey = buildCompileCacheKey(source, options);
    const cached = compileCache.get(cacheKey);
    if (cached) {
      // LRU: 将命中条目移到末尾（最近使用）
      compileCache.delete(cacheKey);
      compileCache.set(cacheKey, cached);
      return { code: cached.code, preamble: cached.preamble, ast: cached.ast };
    }
  }

  // 1. Parse template to AST
  const ast = parse(source, options);

  // 2. Transform AST (包含原 optimize 阶段的 markConstants、hoistStatic、collectDynamicChildren)
  // restOptions inherits ParserOptions & CodegenOptions from CompilerOptions via
  // structural typing (TypeScript's excess property check does not apply when
  // destructuring into a rest object). This ensures type compatibility without
  // explicit casting.
  const {
    nodeTransforms: userNodeTransforms,
    directiveTransforms: userDirectiveTransforms,
    ssrMode,
    ...restOptions
  } = options;

  // In SSR mode, filter out client-only directive transforms (v-on, v-model, v-show)
  let directiveTransforms: Record<string, DirectiveTransform>;
  if (ssrMode) {
    const { on: _on, model: _model, show: _show, ...ssrDirectiveTransforms } =
      builtInDirectiveTransforms;
    directiveTransforms = {
      ...ssrDirectiveTransforms,
      ...(userDirectiveTransforms ?? {}),
    };
  } else {
    directiveTransforms = {
      ...builtInDirectiveTransforms,
      ...(userDirectiveTransforms ?? {}),
    };
  }

  const transformOptions = {
    ...restOptions,
    ssr: ssrMode ?? false,
    nodeTransforms: [...builtInTransforms, ...(userNodeTransforms ?? [])],
    directiveTransforms,
  };
  transform(ast, transformOptions);

  // 3. Generate code
  let codegenResult: CodegenResult;
  if (ssrMode) {
    codegenResult = generateSSR(ast, options);
  } else if (options.rendererMode === 'signal' || options.rendererMode === 'vapor') {
    codegenResult = generateSignal(ast, options);
  } else {
    // 默认 VNode 模式
    codegenResult = generate(ast, options);
  }

  // 4. 存入缓存
  if (!hasCustomTransforms) {
    const cacheKey = buildCompileCacheKey(source, options);
    // LRU 淘汰：超出最大缓存大小时删除最旧条目
    if (compileCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = compileCache.keys().next().value;
      if (oldestKey !== undefined) {
        compileCache.delete(oldestKey);
      }
    }
    compileCache.set(cacheKey, { code: codegenResult.code, preamble: codegenResult.preamble ?? '', ast });
  }

  return codegenResult;
}

// Constants
export {
  NodeTypes,
  ElementTypes,
  ConstantTypes,
  TagType,
  TextModes,
  BindingTypes,
  PatchFlags,
  helperNameMap,
} from './constants';

// Types
export type { RootNode } from './types';
export type { ElementNode } from './types';
export type { TextNode } from './types';
export type { CommentNode } from './types';
export type { InterpolationNode } from './types';
export type { AttributeNode } from './types';
export type { DirectiveNode } from './types';
export type { SimpleExpressionNode } from './types';
export type { CompoundExpressionNode } from './types';
export type { VNodeCall } from './types';
export type { JSCallExpression } from './types';
export type { JSObjectExpression } from './types';
export type { JSProperty } from './types';
export type { JSArrayExpression } from './types';
export type { JSFunctionExpression } from './types';
export type { JSConditionalExpression } from './types';
export type { JSCacheExpression } from './types';
export type { JSChildNode } from './types';
export type { TemplateChildNode } from './types';
export type { ExpressionNode } from './types';
export type { CompilerOptions } from './types';
export type { ParserOptions } from './types';
export type { TransformOptions } from './types';
export type { CodegenOptions } from './types';
export type { TransformContext } from './types';
export type { CodegenResult } from './types';
export type { NodeTransform } from './types';
export type { DirectiveTransform } from './types';
export type { DirectiveTransformResult } from './types';
export type { BindingMetadata } from './types';
export type { SourceLocation } from './types';
export type { ParentNode } from './types';
export type { BaseNode } from './types';
export type { Property } from './types';
export type { RawSourceMap } from './types';

// AST helpers
export { createRoot } from './ast';
export { createElement } from './ast';
export { createText } from './ast';
export { createComment } from './ast';
export { createInterpolation } from './ast';
export { createAttribute } from './ast';
export { createDirective } from './ast';
export { createSimpleExpression } from './ast';
export { createCompoundExpression } from './ast';
export { createVNodeCall } from './ast';
export { createObjectExpression } from './ast';
export { createObjectProperty } from './ast';
export { createCallExpression } from './ast';
export { createConditionalExpression } from './ast';
export { createArrayExpression } from './ast';

// Transforms
export { transformElement } from './transform';
export { transformIf } from './transform';
export { transformFor } from './transform';
export { transformOnce } from './transform';
export { transformSlot } from './transform';
export { transformBind } from './transform';
export { transformOn } from './transform';
export { transformModel } from './transform';
export { transformShow } from './transform';
export { transformVMemo } from './transform';

// Source Map
export { SourceMapGenerator, createSourceMapGenerator } from './source-map';
export type { SourceMapping } from './source-map';

// Note: generateSignal, generateSSR, SFC, and WASM exports are now available
// via sub-path entries:
//   import { generateSignal } from '@lytjs/compiler/signal'
//   import { generateSSR } from '@lytjs/compiler/ssr'
//   import { parseSFC, compileSFC } from '@lytjs/compiler/sfc'
//   import { wasmCompile } from '@lytjs/compiler/wasm'
