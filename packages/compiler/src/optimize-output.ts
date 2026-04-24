/**
 * Lyt.js 模板编译器 — 优化输出 (Optimize Output)
 *
 * 生成对 tree-shaking 友好的代码输出。
 *
 * 核心策略：
 *   - 使用具名导入的辅助函数，而非内联实现
 *   - 只导入实际使用的辅助函数，未使用的可被 tree-shaker 移除
 *   - 使用 createBlock / openBlock 替代普通 h() 调用
 *   - 使用 createTextVNode 替代裸字符串文本
 *
 * 示例：
 *   // 优化前（不可 tree-shake）：
 *   function render() { return h('div', null, h('span', null, text)) }
 *
 *   // 优化后（可 tree-shake）：
 *   import { h, createTextVNode, openBlock, createBlock } from 'lyt'
 *   function render() {
 *     return openBlock(), createBlock('div', null, [createTextVNode(text)])
 *   }
 */

import {
  type RootNode,
  type ElementNode,
  type TextNode,
  type ASTNode,
} from './ast/nodes';
import { CompilerPatchFlags } from './patch-flags';

// ============================================================
// 类型定义
// ============================================================

/** 优化输出选项 */
export interface OptimizeOutputOptions {
  /** 是否启用 tree-shaking 友好模式（默认 true） */
  treeShaking?: boolean;
  /** 是否使用 createBlock 替代 h()（默认 true） */
  useBlock?: boolean;
  /** 是否使用 createTextVNode（默认 true） */
  useTextVNode?: boolean;
  /** 模块导入来源（默认 'lyt'） */
  importSource?: string;
}

/** 优化输出结果 */
export interface OptimizeOutputResult {
  /** 优化后的代码 */
  code: string;
  /** 需要导入的辅助函数列表 */
  imports: string[];
  /** 导入声明代码 */
  importDeclarations: string[];
  /** 提升的静态变量声明 */
  hoistedDecls: string[];
}

// ============================================================
// 辅助函数注册表
// ============================================================

/** 可用的辅助函数及其导入名 */
const HELPER_REGISTRY: Record<string, string> = {
  h: 'h',
  createTextVNode: 'createTextVNode',
  createBlock: 'createBlock',
  openBlock: 'openBlock',
  createVNode: 'createVNode',
  renderList: 'renderList',
  renderSlot: 'renderSlot',
  withDirectives: 'withDirectives',
  resolveComponent: 'resolveComponent',
  resolveDynamicComponent: 'resolveDynamicComponent',
  toDisplayString: 'toDisplayString',
  mergeProps: 'mergeProps',
  normalizeClass: 'normalizeClass',
  normalizeStyle: 'normalizeStyle',
  normalizeProps: 'normalizeProps',
  guardReactiveProps: 'guardReactiveProps',
  cloneVNode: 'cloneVNode',
};

// ============================================================
// 主优化函数
// ============================================================

/**
 * 优化代码输出，生成 tree-shaking 友好的代码
 *
 * @param ast AST 根节点
 * @param rawCode 原始生成的代码
 * @param options 优化选项
 * @returns 优化输出结果
 */
export function optimizeOutput(
  ast: RootNode,
  rawCode: string,
  options: OptimizeOutputOptions = {}
): OptimizeOutputResult {
  const opts = {
    treeShaking: true,
    useBlock: true,
    useTextVNode: true,
    importSource: 'lyt',
    ...options,
  };

  // 收集需要的辅助函数
  const usedHelpers = new Set<string>();

  // 始终需要 h
  usedHelpers.add('h');

  // 分析 AST 确定需要的辅助函数
  analyzeHelperUsage(ast, usedHelpers, opts);

  // 如果使用 Block，需要 openBlock 和 createBlock
  if (opts.useBlock) {
    usedHelpers.add('openBlock');
    usedHelpers.add('createBlock');
  }

  // 生成优化后的代码
  let optimizedCode = rawCode;

  // 替换裸文本字符串为 createTextVNode
  if (opts.useTextVNode) {
    optimizedCode = wrapTextWithCreateTextVNode(optimizedCode, ast);
  }

  // 替换根 h() 为 createBlock()
  if (opts.useBlock) {
    optimizedCode = wrapRootWithBlock(optimizedCode);
  }

  // 生成导入声明
  const importDeclarations = generateImportDeclarations(
    Array.from(usedHelpers),
    opts.importSource
  );

  return {
    code: optimizedCode,
    imports: Array.from(usedHelpers),
    importDeclarations,
    hoistedDecls: [],
  };
}

// ============================================================
// 辅助函数分析
// ============================================================

/**
 * 分析 AST，确定需要哪些辅助函数
 */
function analyzeHelperUsage(
  ast: RootNode,
  helpers: Set<string>,
  opts: OptimizeOutputOptions
): void {
  // 检查 AST 中标记的辅助函数
  for (const helper of ast.helpers) {
    if (HELPER_REGISTRY[helper]) {
      helpers.add(helper);
    }
  }

  // 遍历 AST 检查是否需要特定辅助函数
  function walk(node: ASTNode): void {
    if (node.type === 'Text' && node.isExpression && opts.useTextVNode) {
      helpers.add('createTextVNode');
    }

    if (node.type === 'Element') {
      const nodeAny = node as unknown as Record<string, unknown>;

      // 有插值文本子节点
      for (const child of node.children) {
        if (child.type === 'Text' && child.isExpression && opts.useTextVNode) {
          helpers.add('createTextVNode');
        }
        walk(child);
      }

      // 有循环
      if (nodeAny.eachInfo) {
        helpers.add('renderList');
      }

      // 有插槽
      if (nodeAny.slotInfo) {
        helpers.add('renderSlot');
      }

      // 有动态 class
      if (nodeAny.bindings) {
        const bindings = nodeAny.bindings as Array<{ arg: string }>;
        for (const b of bindings) {
          if (b.arg === 'class') {
            helpers.add('normalizeClass');
          }
          if (b.arg === 'style') {
            helpers.add('normalizeStyle');
          }
        }
      }
    }
  }

  for (const child of ast.children) {
    walk(child);
  }
}

// ============================================================
// 代码转换
// ============================================================

/**
 * 将裸文本字符串包装为 createTextVNode
 *
 * 策略：只包装动态文本（包含 _ctx. 的表达式），不包装静态字符串。
 */
function wrapTextWithCreateTextVNode(code: string, ast: RootNode): string {
  // 查找所有动态文本节点（包含 _ctx. 的表达式）
  // 这些应该被包装为 createTextVNode

  // 简单策略：替换 h() 调用中的裸 _ctx.xxx 参数
  // 更精确的策略需要基于 AST

  let result = code;

  // 替换独立的 _ctx.xxx 表达式（不在字符串引号内）
  // 使用正则匹配 h() 参数中的裸表达式
  result = result.replace(
    /(?<=,\s*)(_ctx\.\w+(?:\.\w+)*(?:\s*\+\s*'[^']*')*)(?=\s*[,)])/g,
    (match) => {
      // 如果已经是字符串，不包装
      if (match.startsWith("'")) return match;
      return `createTextVNode(${match})`;
    }
  );

  return result;
}

/**
 * 将根 h() 调用包装为 openBlock() + createBlock()
 *
 * 策略：在代码开头插入 openBlock()，将第一个 h() 替换为 createBlock()
 */
function wrapRootWithBlock(code: string): string {
  // 在代码开头添加 openBlock()
  // 将第一个 h( 替换为 createBlock(

  let result = code;

  // 替换第一个顶层 h( 为 createBlock(
  // 使用简单的前缀匹配
  const firstHIndex = result.indexOf('h(');
  if (firstHIndex !== -1) {
    result =
      'openBlock(), ' +
      result.substring(0, firstHIndex) +
      'createBlock' +
      result.substring(firstHIndex + 1);
  }

  return result;
}

// ============================================================
// 导入声明生成
// ============================================================

/**
 * 生成 import 声明代码
 *
 * @param helpers 需要导入的辅助函数名列表
 * @param source 导入来源模块
 * @returns import 声明代码行
 */
export function generateImportDeclarations(
  helpers: string[],
  source: string = 'lyt'
): string[] {
  if (helpers.length === 0) return [];

  const sorted = [...helpers].sort();
  return [`import { ${sorted.join(', ')} } from '${source}'`];
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 获取辅助函数的导入名
 *
 * @param name 辅助函数名
 * @returns 导入名，如果不在注册表中则返回 null
 */
export function getHelperImportName(name: string): string | null {
  return HELPER_REGISTRY[name] || null;
}

/**
 * 获取所有可用的辅助函数名列表
 *
 * @returns 辅助函数名数组
 */
export function getAllHelperNames(): string[] {
  return Object.keys(HELPER_REGISTRY);
}
