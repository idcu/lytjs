/**
 * Lyt.js WASM 模拟层 — 浏览器端模板编译器
 *
 * 提供 WASM-ready 的编译 API，当前使用 JavaScript 实现模拟。
 * 接口设计兼容真实 WASM 模块，便于后续无缝替换。
 *
 * 编译流程：parse → transform → optimize → generate
 * 与主编译器 (index.ts compile()) 输出一致。
 */

import {
  type RootNode,
  type ASTNode,
  type Position,
  createRootNode,
  createPosition,
} from './ast/nodes';
import { parseHTML } from './parser/html-parser';
import { transform, type TransformOptions } from './transform/transform';
import { optimize } from './transform/optimize';
import { generate } from './codegen/codegen';
import { tokenize, buildAST, parseInterpolation } from './wasm-parser';
import {
  generateRenderCode,
  generateHoistedCode,
  generatePatchFlags,
  type GenerateOptions,
} from './wasm-generator';
import { CompilerPatchFlags } from './patch-flags';

// ============================================================
// 类型定义
// ============================================================

/** WASM 编译选项 */
export interface WASMCompileOptions {
  /** 输出模式：module（ESM）或 function（函数表达式） */
  mode?: 'module' | 'function';
  /** 是否内联 */
  inline?: boolean;
  /** 是否启用 SSR 模式 */
  ssr?: boolean;
  /** 源文件名（用于错误报告） */
  filename?: string;
}

/** WASM 编译结果 */
export interface WASMCompileResult {
  /** 生成的代码 */
  code: string;
  /** AST 节点数组 */
  ast: ASTNode[];
  /** 编译错误列表 */
  errors: WASMCompileError[];
  /** 编译警告列表 */
  warnings: WASMCompileWarning[];
  /** 渲染函数代码字符串 */
  renderFn: string;
  /** 静态节点数量 */
  staticCount: number;
  /** 动态节点数量 */
  dynamicCount: number;
  /** 编译耗时（毫秒） */
  compileTime: number;
}

/** WASM 编译错误 */
export interface WASMCompileError {
  /** 错误信息 */
  message: string;
  /** 错误位置 */
  loc?: { line: number; column: number; offset: number };
  /** 错误码 */
  code: number;
}

/** WASM 编译警告 */
export interface WASMCompileWarning {
  /** 警告信息 */
  message: string;
  /** 警告位置 */
  loc?: { line: number; column: number };
}

/** WASM 转换选项 */
export interface WASMTransformOptions {
  /** 是否标记静态节点 */
  markStatic?: boolean;
  /** 自定义转换插件 */
  nodeTransforms?: Array<(node: ASTNode, context: any) => void | (() => void)>;
}

/** WASM 代码生成选项 */
export interface WASMGenerateOptions {
  /** 输出模式 */
  mode?: 'module' | 'function';
  /** 变量前缀 */
  prefix?: string;
  /** 是否内联 */
  inline?: boolean;
  /** 是否优化 */
  optimize?: boolean;
}

// ============================================================
// WASMCompiler 接口与实现
// ============================================================

/** WASM 编译器接口 */
export interface WASMCompiler {
  /** 初始化 WASM 模块 */
  init(): Promise<void>;
  /** 编译模板为渲染函数 */
  compile(template: string, options?: WASMCompileOptions): WASMCompileResult;
  /** 解析模板为 AST */
  parse(template: string): ASTNode[];
  /** 转换 AST */
  transform(ast: ASTNode[], options?: WASMTransformOptions): ASTNode[];
  /** 从 AST 生成代码 */
  generate(ast: ASTNode[], options?: WASMGenerateOptions): string;
  /** 获取编译器版本 */
  getVersion(): string;
  /** 获取内存使用量（模拟） */
  getMemoryUsage(): number;
  /** 释放编译器资源 */
  dispose(): void;
}

/** WASM 编译器版本 */
const WASM_COMPILER_VERSION = '0.1.0-wasm-sim';

/**
 * 创建 WASM 编译器实例
 *
 * @returns WASMCompiler 实例
 */
export function createWASMCompiler(): WASMCompiler {
  let initialized = false;
  let disposed = false;
  let totalMemoryAllocated = 0;
  let compilationCount = 0;

  return {
    async init(): Promise<void> {
      if (disposed) {
        throw new Error('WASMCompiler has been disposed');
      }
      // 模拟 WASM 模块初始化
      // 在真实实现中，这里会加载和初始化 .wasm 文件
      initialized = true;
    },

    compile(template: string, options: WASMCompileOptions = {}): WASMCompileResult {
      if (disposed) {
        throw new Error('WASMCompiler has been disposed');
      }
      if (!initialized) {
        throw new Error('WASMCompiler not initialized. Call init() first.');
      }

      const startTime = performance.now();
      const errors: WASMCompileError[] = [];
      const warnings: WASMCompileWarning[] = [];

      // 阶段 1：解析
      let ast: RootNode;
      try {
        ast = parseHTML(template);
      } catch (err: any) {
        errors.push({
          message: err.message || 'Parse error',
          code: 1001,
        });
        return {
          code: '',
          ast: [],
          errors,
          warnings,
          renderFn: '',
          staticCount: 0,
          dynamicCount: 0,
          compileTime: performance.now() - startTime,
        };
      }

      // 阶段 2：转换
      try {
        transform(ast);
      } catch (err: any) {
        errors.push({
          message: err.message || 'Transform error',
          code: 1002,
        });
      }

      // 阶段 3：优化
      const hoistResult = optimize(ast);

      // 阶段 4：代码生成
      let code = '';
      try {
        const codegenResult = generate(ast);
        code = codegenResult.code;
      } catch (err: any) {
        errors.push({
          message: err.message || 'Code generation error',
          code: 1003,
        });
      }

      // 统计静态/动态节点数
      const { staticCount, dynamicCount } = countNodes(ast.children);

      // 生成渲染函数代码
      let renderFn = code;
      if (options.mode === 'module') {
        renderFn = `import { h, renderList } from 'lyt'\n\nexport default function render(_ctx) {\n  return ${code}\n}\n`;
      } else if (options.inline !== true) {
        renderFn = `function render(_ctx) {\n  return ${code}\n}`;
      }

      // SSR 模式警告
      if (options.ssr) {
        warnings.push({
          message: 'SSR mode is simulated in WASM layer. Full SSR support requires server-side runtime.',
        });
      }

      // 模拟内存分配
      totalMemoryAllocated += template.length * 2 + code.length;
      compilationCount++;

      const compileTime = performance.now() - startTime;

      return {
        code,
        ast: ast.children,
        errors,
        warnings,
        renderFn,
        staticCount,
        dynamicCount,
        compileTime,
      };
    },

    parse(template: string): ASTNode[] {
      if (disposed) throw new Error('WASMCompiler has been disposed');
      if (!initialized) throw new Error('WASMCompiler not initialized. Call init() first.');

      const ast = parseHTML(template);
      totalMemoryAllocated += template.length * 2;
      return ast.children;
    },

    transform(ast: ASTNode[], options: WASMTransformOptions = {}): ASTNode[] {
      if (disposed) throw new Error('WASMCompiler has been disposed');
      if (!initialized) throw new Error('WASMCompiler not initialized. Call init() first.');

      // 将 ASTNode[] 包装为 RootNode 进行转换
      const root = createRootNode(createPosition(0, 0, 1, 1));
      root.children = ast as any;

      const transformOpts: TransformOptions = {
        markStatic: options.markStatic,
        nodeTransforms: options.nodeTransforms as any,
      };
      transform(root, transformOpts);

      return root.children;
    },

    generate(ast: ASTNode[], options: WASMGenerateOptions = {}): string {
      if (disposed) throw new Error('WASMCompiler has been disposed');
      if (!initialized) throw new Error('WASMCompiler not initialized. Call init() first.');

      const genOpts: GenerateOptions = {
        mode: options.mode,
        prefix: options.prefix,
        inline: options.inline,
        optimize: options.optimize,
      };
      return generateRenderCode(ast, genOpts);
    },

    getVersion(): string {
      return WASM_COMPILER_VERSION;
    },

    getMemoryUsage(): number {
      return totalMemoryAllocated;
    },

    dispose(): void {
      disposed = true;
      initialized = false;
      totalMemoryAllocated = 0;
      compilationCount = 0;
    },
  };
}

// ============================================================
// 辅助函数
// ============================================================

/** 统计 AST 中的静态和动态节点数 */
function countNodes(
  children: (ASTNode)[]
): { staticCount: number; dynamicCount: number } {
  let staticCount = 0;
  let dynamicCount = 0;

  function walk(node: ASTNode): void {
    if (node.type === 'Text') {
      if (node.isExpression) {
        dynamicCount++;
      } else {
        staticCount++;
      }
      return;
    }

    if (node.type === 'Element') {
      if (node.staticFlag === 1) {
        staticCount++;
      } else {
        dynamicCount++;
      }
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  for (const child of children) {
    walk(child);
  }

  return { staticCount, dynamicCount };
}
