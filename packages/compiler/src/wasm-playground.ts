/**
 * Lyt.js WASM 模拟层 — Playground 集成助手
 *
 * 提供浏览器端编译的高级 API，专为 Playground 场景设计。
 * 支持模板编译、热重载、缓存和统计功能。
 */

import {
  type ASTNode,
  createRootNode,
  createPosition,
} from './ast/nodes';
import { parseHTML } from './parser/html-parser';
import { transform } from './transform/transform';
import { optimize } from './transform/optimize';
import { generate } from './codegen/codegen';
import { createWASMCompiler, type WASMCompileResult } from './wasm-compiler';

// ============================================================
// 类型定义
// ============================================================

/** 渲染函数类型 */
export interface RenderFunction {
  (h: any, renderList: any, ctx: any): any;
}

/** 编译器统计信息 */
export interface CompilerStats {
  /** 总编译次数 */
  totalCompilations: number;
  /** 平均编译时间（毫秒） */
  averageCompileTime: number;
  /** 总错误数 */
  totalErrors: number;
  /** 缓存命中率 */
  cacheHitRate: number;
}

/** 浏览器编译器接口 */
export interface BrowserCompiler {
  /** 将模板字符串编译为可执行的渲染函数 */
  compileToFunction(template: string): RenderFunction;
  /** 完整编译（返回详细结果） */
  compile(template: string): WASMCompileResult;
  /** 热重载：仅重新编译变更部分 */
  hotReload(oldResult: WASMCompileResult, newTemplate: string): WASMCompileResult;
  /** 获取编译统计信息 */
  getStats(): CompilerStats;
}

// ============================================================
// 缓存条目
// ============================================================

interface CacheEntry {
  template: string;
  result: WASMCompileResult;
  renderFn: RenderFunction | null;
}

// ============================================================
// 创建浏览器编译器
// ============================================================

/**
 * 创建浏览器端编译器实例
 *
 * 提供缓存、热重载和统计功能，专为 Playground 场景优化。
 *
 * @returns BrowserCompiler 实例
 */
export function createBrowserCompiler(): BrowserCompiler {
  const wasmCompiler = createWASMCompiler();
  const cache = new Map<string, CacheEntry>();
  let totalCompilations = 0;
  let totalCompileTime = 0;
  let totalErrors = 0;
  let cacheHits = 0;
  let cacheMisses = 0;

  // 初始化 WASM 编译器
  let initPromise: Promise<void> | null = null;

  async function ensureInit(): Promise<void> {
    if (!initPromise) {
      initPromise = wasmCompiler.init();
    }
    return initPromise;
  }

  /**
   * 将模板字符串编译为可执行的渲染函数
   */
  async function compileToFunction(template: string): Promise<RenderFunction> {
    await ensureInit();

    // 检查缓存
    const cached = cache.get(template);
    if (cached && cached.renderFn) {
      cacheHits++;
      return cached.renderFn;
    }

    cacheMisses++;

    // 编译
    const result = wasmCompiler.compile(template);
    totalCompilations++;
    totalCompileTime += result.compileTime;
    totalErrors += result.errors.length;

    if (result.errors.length > 0) {
      throw new Error(`Compilation failed: ${result.errors.map(e => e.message).join('; ')}`);
    }

    // 创建渲染函数
    const renderFn = new Function('h', 'renderList', '_ctx', `return ${result.code}`) as any as RenderFunction;

    // 创建轻量 h 函数用于测试
    function h(tag: string, props: any, children: any): any {
      return { tag, props, children };
    }

    function renderList(list: any, fn: any): any[] {
      if (!list) return [];
      return Array.from(list).map(fn);
    }

    // 缓存结果
    cache.set(template, {
      template,
      result,
      renderFn: (ctx: any) => renderFn(h, renderList, ctx),
    });

    return (ctx: any) => renderFn(h, renderList, ctx);
  }

  /**
   * 完整编译
   */
  async function compileFull(template: string): Promise<WASMCompileResult> {
    await ensureInit();

    const cached = cache.get(template);
    if (cached) {
      cacheHits++;
      return cached.result;
    }

    cacheMisses++;
    const result = wasmCompiler.compile(template);
    totalCompilations++;
    totalCompileTime += result.compileTime;
    totalErrors += result.errors.length;

    cache.set(template, { template, result, renderFn: null });
    return result;
  }

  /**
   * 热重载
   */
  async function hotReload(
    oldResult: WASMCompileResult,
    newTemplate: string
  ): Promise<WASMCompileResult> {
    await ensureInit();

    // 如果模板未变，返回缓存结果
    if (oldResult.code && cache.has(newTemplate)) {
      cacheHits++;
      return cache.get(newTemplate)!.result;
    }

    cacheMisses++;

    // 编译新模板
    const result = wasmCompiler.compile(newTemplate);
    totalCompilations++;
    totalCompileTime += result.compileTime;
    totalErrors += result.errors.length;

    // 更新缓存
    cache.set(newTemplate, { template: newTemplate, result, renderFn: null });

    return result;
  }

  /**
   * 获取统计信息
   */
  function getStats(): CompilerStats {
    const totalLookups = cacheHits + cacheMisses;
    return {
      totalCompilations,
      averageCompileTime: totalCompilations > 0
        ? totalCompileTime / totalCompilations
        : 0,
      totalErrors,
      cacheHitRate: totalLookups > 0
        ? cacheHits / totalLookups
        : 0,
    };
  }

  return {
    compileToFunction: compileToFunction as any,
    compile: compileFull as any,
    hotReload: hotReload as any,
    getStats,
  };
}
