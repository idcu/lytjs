// src/index.ts
// @lytjs/compiler - Main entry point
// 重新导出 all public APIs

// Compile function
import { parse } from './parser';
import { transform, builtInTransforms, builtInDirectiveTransforms, optimize } from './transform';
import { generate } from './codegen';
import { generateSignal } from './codegen-signal';
import { generateSignalOptimized } from './codegen-signal-optimized';
import { generateSSR } from './codegen-ssr';
import type { CompilerOptions, CodegenResult, DirectiveTransform, RootNode } from './types';

// Server Components (Phase 1.4)
export {
  detectServerDirective,
  analyzeServerComponent,
  compileServerComponent,
  createServerReference,
  createServerProxy,
} from './server-components';
export type {
  ServerDirective,
  ServerComponentAnalysis,
  ServerComponentOptions,
  ServerComponentResult,
} from './server-components';

// Client/Server Boundary (Phase 1.6)
export {
  analyzeBoundary,
  splitClientServer,
  runtime,
  serverOnly,
  clientOnly,
  createEnvironmentValue,
} from './client-server-boundary';
export type {
  BoundaryType,
  BoundaryAnalysis,
  ComponentBoundary,
  SplitResult,
  SplitOptions,
} from './client-server-boundary';

// Optimizations (Phase 1.12-1.14)
export {
  analyzeMemoNeeds,
  analyzeDeadCode,
  eliminateDeadCode,
  precompileTemplate,
} from './optimizations';
export type {
  MemoAnalysis,
  StaticSubtree,
  DynamicBinding,
  MemoBoundary,
  DeadCodeAnalysis,
  UnreachableCode,
  ConstantFoldingOpportunity,
  AOTOptions,
  AOTResult,
} from './optimizations';

export { parse, transform, optimize, generate };
export { generateSignalOptimized };

// ============================================================
// LRU 编译缓存
// ============================================================

/** LRU 缓存条目 */
interface CompileCacheEntry {
  code: string;
  preamble: string;
  // FIX: P1-24 使用 RootNode 类型替代 any，提供类型安全
  ast: RootNode;
}

/** 最大缓存条目数 */
const MAX_CACHE_SIZE = 100;

/** FIX: P2-22 编译警告级别可配置 */
export type WarningLevel = 'silent' | 'error' | 'warn';

let globalWarningLevel: WarningLevel = 'warn';

export function setWarningLevel(level: WarningLevel): void {
  globalWarningLevel = level;
}

export function getWarningLevel(): WarningLevel {
  return globalWarningLevel;
}

/** 编译缓存（Map 天然保持插入顺序，用于 LRU 淘汰） */
const compileCache = new Map<string, CompileCacheEntry>();

/**
 * FIX: P2-2 编译结果缓存机制增强
 * 使用文件内容哈希作为缓存 key，提高缓存命中率和安全性
 */

/** 内容哈希缓存 Map - 存储文件内容到哈希的映射 */
const contentHashCache = new Map<string, string>();

// FIX: P2-39 contentHashCache 添加 LRU 淘汰策略，避免无限增长导致内存泄漏
const MAX_CONTENT_HASH_CACHE_SIZE = 200;

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
 * FIX: P2-2 计算文件内容的 SHA-256 风格哈希（简化版）
 * 用于作为编译缓存的 key，确保相同内容产生相同的缓存键
 *
 * FIX: P2-40 使用 djb2 快速哈希作为 contentHashCache 的 key，
 * 而非完整模板字符串，大幅减少内存占用
 */
function computeContentHash(content: string): string {
  // FIX: P2-40 使用快速哈希作为缓存 key，避免存储完整模板字符串
  const quickHash = hashString(content);

  // 检查是否已有缓存的哈希
  const cachedHash = contentHashCache.get(quickHash);
  if (cachedHash) {
    return cachedHash;
  }

  // 使用 djb2 哈希算法计算内容哈希（简化版 SHA-256 风格）
  let hash1 = 5381;
  let hash2 = 52711;
  
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1 + char) & 0xffffffff;
    hash2 = ((hash2 << 7) + hash2 + char) & 0xffffffff;
  }
  
  // 组合两个哈希值，提高碰撞抵抗
  const combinedHash = `${hash1 >>> 0}-${hash2 >>> 0}`;
  
  // FIX: P2-39 LRU 淘汰：超出最大缓存大小时删除最旧条目
  if (contentHashCache.size >= MAX_CONTENT_HASH_CACHE_SIZE) {
    const oldestKey = contentHashCache.keys().next().value;
    if (oldestKey !== undefined) {
      contentHashCache.delete(oldestKey);
    }
  }
  
  // 缓存哈希结果（使用快速哈希作为 key）
  contentHashCache.set(quickHash, combinedHash);
  
  return combinedHash;
}

/**
 * 构建编译缓存键，确保读取和写入使用相同的键生成逻辑。
 * FIX: P1-25 缓存键覆盖所有影响编译结果的选项，
 * 包括 source、ssrMode、rendererMode、scopeId、inline、mode 等
 * FIX: P2-2 使用文件内容哈希作为 key 的一部分，提高缓存精度
 */
function buildCompileCacheKey(source: string, options: CompilerOptions): string {
  // FIX: P2-2 使用内容哈希替代原始 source 字符串，减少缓存键大小
  const contentHash = computeContentHash(source);
  
  return hashString(
    contentHash + '|' +
    String(options.ssrMode ?? false) + '|' +
    String(options.rendererMode ?? '') + '|' +
    String(options.scopeId ?? '') + '|' +
    String(options.inline ?? false) + '|' +
    String(options.mode ?? '') + '|' +
    String(options.prefixIdentifiers ?? false) + '|' +
    String(options.whitespace ?? ''),
  );
}

/**
 * 清除编译缓存。用于测试或需要释放内存时。
 * FIX: P2-2 同时清除内容哈希缓存
 */
export function clearCompileCache(): void {
  compileCache.clear();
  contentHashCache.clear();
}

/**
 * 获取当前编译缓存大小。用于调试和测试。
 */
export function getCompileCacheSize(): number {
  return compileCache.size;
}

/**
 * FIX: P2-2 获取内容哈希缓存大小（用于调试）
 */
export function getContentHashCacheSize(): number {
  return contentHashCache.size;
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
      // FIX: P2-41 接受非严格 LRU：缓存命中时不移动条目位置。
      // 原实现通过 delete + set 将命中条目移到末尾以模拟 LRU，
      // 但这会导致 Map 内部存储重组（V8 中 Map 的 delete 操作
      // 在大量条目时可能触发哈希表重建），影响性能。
      // 对于编译缓存场景，非严格 LRU（仅淘汰最旧条目）已足够。
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
    // Phase 1.1: 使用优化版本的 Signal 代码生成器
    // 当 optimizeSignal 选项为 true 时使用优化版本（默认为 true）
    if (options.optimizeSignal !== false) {
      codegenResult = generateSignalOptimized(ast, options);
    } else {
      codegenResult = generateSignal(ast, options);
    }
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

// 常量
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

// 类型定义
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

// 转换s
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
