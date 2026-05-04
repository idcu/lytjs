/**
 * @lytjs/compiler - WASM Compiler Interface
 * WASM-ready 浏览器端编译器接口。
 * 当前使用 JavaScript 模拟实现，接口设计兼容真实 WASM 模块，
 * 便于后续无缝替换。
 */

import { parse } from '../parser';
import { transform } from '../transform';
import { generate } from '../codegen';
import { generateSSR } from '../codegen-ssr';
import { NodeTypes } from '../constants';
import type { RootNode, TemplateChildNode, ElementNode, SourceLocation } from '../types';

// ============================================================
// Types
// ============================================================

/** WASM 编译选项 */
export interface WASMCompileOptions {
  /** 编译模式：'module' 生成 ES module 导出，'function' 生成独立函数 */
  mode?: 'module' | 'function'
  /** 是否内联编译（跳过 hoist 优化） */
  inline?: boolean
  /** 是否启用 SSR 模式 */
  ssr?: boolean
  /** 模板文件名，用于错误提示和 source map */
  filename?: string
}

/** WASM 编译结果 */
export interface WASMCompileResult {
  /** 生成的渲染函数代码 */
  code: string
  /** 序列化后的 AST 节点数组 */
  ast: ASTNode[]
  /** 编译错误列表 */
  errors: WASMCompileError[]
  /** 编译警告列表 */
  warnings: WASMCompileWarning[]
  /** 提取的渲染函数名称 */
  renderFn: string
  /** 静态节点数量 */
  staticCount: number
  /** 动态节点数量 */
  dynamicCount: number
  /** 编译耗时（毫秒） */
  compileTime: number
}

/** WASM 编译错误 */
export interface WASMCompileError {
  /** 错误信息 */
  message: string
  /** 错误位置 */
  loc?: SourceLocation
  /** 错误代码标识 */
  code?: string
}

/** WASM 编译警告 */
export interface WASMCompileWarning {
  /** 警告信息 */
  message: string
  /** 警告位置 */
  loc?: SourceLocation
}

/** WASM 转换选项 */
export interface WASMTransformOptions {
  /** 是否标记静态节点 */
  markStatic?: boolean
  /** 自定义节点转换器 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodeTransforms?: Array<(node: any, context: any) => void | (() => void) | (() => void)[]>
}

/** WASM 代码生成选项 */
export interface WASMGenerateOptions {
  /** 代码生成模式 */
  mode?: 'module' | 'function'
  /** 代码前缀（如 import 语句） */
  prefix?: string
  /** 是否内联生成 */
  inline?: boolean
}

/** 序列化 AST 节点（浏览器可传输的 JSON 友好格式） */
export interface ASTNode {
  /** 节点类型 */
  type: string
  /** 节点标签名（仅元素节点） */
  tag?: string
  /** 子节点 */
  children?: ASTNode[]
  /** 属性列表 */
  props?: Array<{ name: string; value?: string; dynamic?: boolean }>
  /** 文本内容（仅文本/插值节点） */
  content?: string
  /** 是否为静态节点 */
  isStatic?: boolean
  /** patch flag（仅元素节点） */
  patchFlag?: number
  /** 源码位置 */
  loc?: SourceLocation
}

/** Token 类型 */
export interface Token {
  type: 'tag-open' | 'tag-close' | 'tag-name' | 'attr-name' | 'attr-value' | 'text' | 'interpolation' | 'comment'
  value: string
  loc?: SourceLocation
}

// ============================================================
// wasmCompile — 主编译函数
// ============================================================

/**
 * WASM 编译器入口函数。
 * 执行完整的 parse -> transform -> generate 流程，
 * 返回结构化的编译结果。
 */
export function wasmCompile(
  source: string,
  options: WASMCompileOptions = {},
): WASMCompileResult {
  const startTime = performance.now();
  const errors: WASMCompileError[] = [];
  const warnings: WASMCompileWarning[] = [];

  const { mode = 'module', inline = false, ssr = false, filename = 'template.html' } = options;

  // 1. Parse
  let root: RootNode;
  try {
    root = parse(source, {
      onError: (error: Error) => {
        errors.push({ message: error.message, code: 'PARSE_ERROR' });
      },
    });
  } catch (error) {
    const err = error as Error;
    return {
      code: '',
      ast: [],
      errors: [{ message: err.message, code: 'PARSE_ERROR' }],
      warnings,
      renderFn: 'render',
      staticCount: 0,
      dynamicCount: 0,
      compileTime: performance.now() - startTime,
    };
  }

  // 2. Transform
  try {
    transform(root, {
      ssr,
      inline,
      onError: (error: Error) => {
        errors.push({ message: error.message, code: 'TRANSFORM_ERROR' });
      },
      onWarn: (warning: string) => {
        warnings.push({ message: warning });
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  } catch (error) {
    const err = error as Error;
    return {
      code: '',
      ast: serializeAST(root),
      errors: [...errors, { message: err.message, code: 'TRANSFORM_ERROR' }],
      warnings,
      renderFn: 'render',
      staticCount: 0,
      dynamicCount: 0,
      compileTime: performance.now() - startTime,
    };
  }

  // 3. Generate
  let code: string;
  try {
    if (ssr) {
      const result = generateSSR(root, { filename, mode });
      code = result.code;
    } else {
      const result = generate(root, { filename, mode, sourceMap: false });
      code = result.code;
    }
  } catch (error) {
    const err = error as Error;
    return {
      code: '',
      ast: serializeAST(root),
      errors: [...errors, { message: err.message, code: 'GENERATE_ERROR' }],
      warnings,
      renderFn: 'render',
      staticCount: 0,
      dynamicCount: 0,
      compileTime: performance.now() - startTime,
    };
  }

  // 4. 序列化 AST 和统计节点
  const astNodes = serializeAST(root);
  const { staticCount, dynamicCount } = countNodes(root);
  const compileTime = performance.now() - startTime;

  return {
    code,
    ast: astNodes,
    errors,
    warnings,
    renderFn: 'render',
    staticCount,
    dynamicCount,
    compileTime,
  };
}

// ============================================================
// AST 序列化
// ============================================================

/**
 * 将编译器内部 AST 序列化为 JSON 友好的 ASTNode[] 格式。
 */
export function serializeAST(root: RootNode): ASTNode[] {
  return root.children.map((child) => serializeNode(child));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function serializeNode(node: TemplateChildNode): ASTNode {
  switch (node.type) {
    case NodeTypes.ELEMENT: {
      const el = node as ElementNode;
      return {
        type: 'Element',
        tag: el.tag,
        children: el.children.map((c) => serializeNode(c)),
        props: el.props.map((p) => {
          if (p.type === NodeTypes.ATTRIBUTE) {
            return { name: p.name, value: p.value?.content };
          }
          return {
            name: `v-${p.name}`,
            value: (p.exp as any)?.content,
            dynamic: true,
          };
        }),
        isStatic: (el as any).isStatic,
        patchFlag: (el as any).patchFlag,
        loc: node.loc,
      };
    }
    case NodeTypes.TEXT:
      return {
        type: 'Text',
        content: (node as any).content,
        isStatic: (node as any).isStatic,
        loc: node.loc,
      };
    case NodeTypes.INTERPOLATION:
      return {
        type: 'Interpolation',
        content: (node as any).content?.content ?? '',
        isStatic: false,
        loc: node.loc,
      };
    case NodeTypes.COMMENT:
      return {
        type: 'Comment',
        content: (node as any).content,
        loc: node.loc,
      };
    default:
      return { type: `Unknown(${node.type})`, loc: node.loc };
  }
}

// ============================================================
// 节点统计
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
function countNodes(root: RootNode): { staticCount: number; dynamicCount: number } {
  let staticCount = 0;
  let dynamicCount = 0;

  function walk(node: TemplateChildNode): void {
    switch (node.type) {
      case NodeTypes.ELEMENT: {
        const el = node as any;
        if (el.isStatic) {
          staticCount++;
        } else {
          dynamicCount++;
        }
        for (const child of el.children) {
          walk(child);
        }
        break;
      }
      case NodeTypes.TEXT:
      case NodeTypes.COMMENT:
        staticCount++;
        break;
      case NodeTypes.INTERPOLATION:
        dynamicCount++;
        break;
    }
  }

  for (const child of root.children) {
    walk(child);
  }

  return { staticCount, dynamicCount };
}
