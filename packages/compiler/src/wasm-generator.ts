/**
 * Lyt.js WASM 模拟层 — 浏览器优化的代码生成器
 *
 * 生成优化的 JavaScript 渲染函数代码，专为浏览器执行环境设计。
 * 接口与主代码生成器 (codegen.ts) 兼容，但增加了 WASM-ready 的 API。
 *
 * 生成特性：
 *   - 支持 module 和 function 两种输出模式
 *   - 可配置变量前缀
 *   - 静态提升代码生成
 *   - Patch flags 生成
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

/** 代码生成选项 */
export interface GenerateOptions {
  /** 输出模式：module（ESM 导出）或 function（函数表达式） */
  mode?: 'module' | 'function';
  /** 变量前缀（默认 '_'） */
  prefix?: string;
  /** 是否内联代码（无额外格式化） */
  inline?: boolean;
  /** 是否启用优化 */
  optimize?: boolean;
}

/** 静态提升代码生成结果 */
export interface HoistedCodeResult {
  /** 主渲染代码 */
  code: string;
  /** 提升的静态变量声明列表 */
  hoisted: string[];
}

// ============================================================
// 主代码生成函数
// ============================================================

/**
 * 生成渲染函数代码
 *
 * @param ast AST 节点数组（顶层子节点）
 * @param options 生成选项
 * @returns 生成的代码字符串
 */
export function generateRenderCode(
  ast: ASTNode[],
  options: GenerateOptions = {}
): string {
  const {
    mode = 'function',
    prefix = '_',
    inline = false,
    optimize = true,
  } = options;

  const ctxPrefix = `${prefix}ctx`;

  // 生成子节点代码
  const bodyCode = generateNodes(ast, ctxPrefix, optimize);

  if (mode === 'module') {
    // ESM 模块模式
    return `import { h, renderList } from 'lyt'\n\n` +
      `export default function render(${ctxPrefix}) {\n` +
      `  return ${bodyCode}\n` +
      `}\n`;
  }

  // 函数模式
  if (inline) {
    return bodyCode;
  }

  return `function render(${ctxPrefix}) {\n` +
    `  return ${bodyCode}\n` +
    `}`;
}

// ============================================================
// 静态提升代码生成
// ============================================================

/**
 * 生成静态提升代码
 *
 * 分析 AST 中的静态节点，生成提升到渲染函数外部的变量声明。
 *
 * @param ast AST 节点数组
 * @returns 提升代码结果
 */
export function generateHoistedCode(ast: ASTNode[]): HoistedCodeResult {
  const hoisted: string[] = [];
  let hoistCounter = 0;

  // 收集可提升的静态节点
  const staticNodes: ASTNode[] = [];
  for (const node of ast) {
    collectHoistable(node, staticNodes);
  }

  // 为每个提升节点生成声明
  for (const node of staticNodes) {
    hoistCounter++;
    const name = `_hoisted_${hoistCounter}`;
    const code = generateSingleNode(node, '_ctx', true);
    hoisted.push(`const ${name} = ${code}`);
  }

  // 生成主代码（使用提升变量替换静态节点）
  const mainCode = generateNodes(ast, '_ctx', true);

  return {
    code: mainCode,
    hoisted,
  };
}

/**
 * 收集可提升的静态节点
 */
function collectHoistable(node: ASTNode, result: ASTNode[]): void {
  if (node.type === 'Element') {
    if (isNodeStatic(node)) {
      result.push(node);
      return; // 不需要递归子节点
    }
    for (const child of node.children) {
      collectHoistable(child, result);
    }
  }
}

/**
 * 判断节点是否为静态
 */
function isNodeStatic(node: ASTNode): boolean {
  if (node.type === 'Text') {
    return !node.isExpression;
  }
  if (node.type === 'Element') {
    const nodeAny = node as unknown as Record<string, unknown>;
    if (
      node.directives.length > 0 ||
      nodeAny.ifCondition ||
      nodeAny.eachInfo ||
      (nodeAny.bindings && (nodeAny.bindings as unknown[]).length > 0) ||
      (nodeAny.events && (nodeAny.events as unknown[]).length > 0) ||
      nodeAny.slotInfo ||
      nodeAny.refInfo
    ) {
      return false;
    }
    for (const prop of node.props) {
      if (prop.isDynamic || prop.isEvent) return false;
    }
    return node.children.every(child => isNodeStatic(child));
  }
  return false;
}

// ============================================================
// Patch Flags 生成
// ============================================================

/**
 * 为 AST 节点生成 Patch Flag
 *
 * @param node AST 节点
 * @returns 补丁标记值
 */
export function generatePatchFlags(node: ASTNode): number {
  if (node.type === 'Text') {
    return node.isExpression
      ? CompilerPatchFlags.TEXT
      : CompilerPatchFlags.HOISTED;
  }

  if (node.type !== 'Element') {
    return 0;
  }

  const nodeAny = node as unknown as Record<string, unknown>;

  // v-if → BAIL
  if (nodeAny.ifCondition) {
    return CompilerPatchFlags.BAIL;
  }

  // v-each → NEED_PATCH
  if (nodeAny.eachInfo) {
    return CompilerPatchFlags.NEED_PATCH;
  }

  let flag = 0;

  // 动态绑定
  if (nodeAny.bindings && (nodeAny.bindings as any[]).length > 0) {
    for (const binding of (nodeAny.bindings as any[])) {
      if (binding.arg === 'class') {
        flag |= CompilerPatchFlags.CLASS;
      } else if (binding.arg === 'style') {
        flag |= CompilerPatchFlags.STYLE;
      } else {
        flag |= CompilerPatchFlags.PROPS;
      }
    }
  }

  // 事件绑定
  if (nodeAny.events && (nodeAny.events as any[]).length > 0) {
    flag |= CompilerPatchFlags.EVENT;
  }

  // 插槽
  if (nodeAny.slotInfo) {
    flag |= CompilerPatchFlags.SLOTS;
  }

  // 引用
  if (nodeAny.refInfo) {
    flag |= CompilerPatchFlags.NEED_PATCH;
  }

  // 检查子节点
  if (node.children && node.children.length > 0) {
    const hasDynamicChild = node.children.some((child: any) => {
      if (child.type === 'Text' && child.isExpression) return true;
      if (child.type === 'Element') {
        return child.directives?.length > 0 ||
          child.ifCondition || child.eachInfo ||
          (child.bindings?.length > 0) ||
          (child.events?.length > 0);
      }
      return false;
    });

    if (hasDynamicChild) {
      const hasKeyed = node.children.some((child: any) =>
        child.type === 'Element' && child.props?.some(
          (p: any) => p.name === 'key' && p.isDynamic
        )
      );
      flag |= hasKeyed
        ? CompilerPatchFlags.KEYED_FRAGMENT
        : CompilerPatchFlags.UNKEYED_FRAGMENT;
    }
  }

  if (flag === 0 && node.staticFlag === 1) {
    return CompilerPatchFlags.HOISTED;
  }

  return flag;
}

// ============================================================
// 内部代码生成函数
// ============================================================

/**
 * 生成节点列表的代码
 */
function generateNodes(nodes: ASTNode[], ctxPrefix: string, optimize: boolean): string {
  if (nodes.length === 0) return 'null';
  if (nodes.length === 1) return generateSingleNode(nodes[0], ctxPrefix, optimize);
  const parts = nodes.map(n => generateSingleNode(n, ctxPrefix, optimize));
  return `[${parts.join(', ')}]`;
}

/**
 * 生成单个节点的代码
 */
function generateSingleNode(node: ASTNode, ctxPrefix: string, optimize: boolean): string {
  if (node.type === 'Text') {
    return generateTextCode(node, ctxPrefix);
  }
  if (node.type === 'Element') {
    return generateElementCode(node, ctxPrefix, optimize);
  }
  return 'null';
}

/**
 * 生成文本节点代码
 */
function generateTextCode(node: TextNode, ctxPrefix: string): string {
  if (!node.isExpression) {
    return `'${escapeStr(node.content)}'`;
  }

  // 解析插值
  const parts = parseInterpolationParts(node.content);
  if (parts.length === 1 && parts[0].type === 'expression') {
    return wrapExpr(parts[0].value, ctxPrefix);
  }

  const segments = parts.map(part => {
    if (part.type === 'text') return `'${escapeStr(part.value)}'`;
    return wrapExpr(part.value, ctxPrefix);
  });
  return segments.join(' + ');
}

/**
 * 生成元素节点代码
 */
function generateElementCode(node: ElementNode, ctxPrefix: string, optimize: boolean): string {
  const nodeAny = node as unknown as Record<string, unknown>;

  // v-if
  if (nodeAny.ifCondition) {
    const cond = wrapExpr(nodeAny.ifCondition as string, ctxPrefix);
    const inner = generateElementInner(node, ctxPrefix, optimize);
    return `(${cond} ? (${inner}) : null)`;
  }

  // v-each
  if (nodeAny.eachInfo) {
    const info = nodeAny.eachInfo as { item: string; index: string; collection: string };
    const inner = generateElementInner(node, ctxPrefix, optimize);
    let args = `(${info.item}`;
    if (info.index) args += `, ${info.index}`;
    args += ')';
    return `renderList(${wrapExpr(info.collection, ctxPrefix)}, ${args} => ${inner})`;
  }

  return generateElementInner(node, ctxPrefix, optimize);
}

/**
 * 生成元素内部代码
 */
function generateElementInner(node: ElementNode, ctxPrefix: string, optimize: boolean): string {
  const nodeAny = node as unknown as Record<string, unknown>;
  const tag = node.isComponent ? node.tag : `'${node.tag}'`;

  // 生成 props
  const propsParts: string[] = [];

  // 静态属性
  for (const attr of node.props) {
    if (attr.isDynamic || attr.isEvent) continue;
    if (attr.value === null) {
      propsParts.push(`'${attr.name}': true`);
    } else {
      propsParts.push(`'${attr.name}': '${escapeStr(attr.value)}'`);
    }
  }

  // 动态绑定
  if (nodeAny.bindings) {
    for (const binding of (nodeAny.bindings as any[])) {
      if (binding.isModel) {
        propsParts.push(
          `model: { value: ${wrapExpr(binding.value, ctxPrefix)}, callback: $event => ${wrapExpr(binding.value, ctxPrefix)} = $event }`
        );
      } else {
        propsParts.push(`'${binding.arg}': ${wrapExpr(binding.value, ctxPrefix)}`);
      }
    }
  }

  // 事件
  if (nodeAny.events) {
    for (const event of (nodeAny.events as any[])) {
      const eventName = `on${capitalize(event.name)}`;
      propsParts.push(`'${eventName}': ${wrapExpr(event.value, ctxPrefix)}`);
    }
  }

  // 引用
  if (nodeAny.refInfo) {
    propsParts.push(`ref: '${(nodeAny.refInfo as any).name}'`);
  }

  // 插槽
  if (nodeAny.slotInfo) {
    propsParts.push(`'slot': '${(nodeAny.slotInfo as any).name}'`);
  }

  const propsCode = propsParts.length > 0 ? `{ ${propsParts.join(', ')} }` : 'null';

  // 子节点
  const childrenCode = generateNodes(node.children, ctxPrefix, optimize);

  let code = `h(${tag}, ${propsCode}`;
  if (childrenCode && childrenCode !== 'null') {
    code += `, ${childrenCode}`;
  }
  code += ')';

  return code;
}

// ============================================================
// 工具函数
// ============================================================

interface InterpolationPart {
  type: 'text' | 'expression';
  value: string;
}

function parseInterpolationParts(content: string): InterpolationPart[] {
  const parts: InterpolationPart[] = [];
  const regex = /\{\{([\s\S]*?)\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'expression', value: match[1].trim() });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return parts;
}

function wrapExpr(expr: string, ctxPrefix: string): string {
  expr = expr.trim();
  if (expr.startsWith(`${ctxPrefix}.`)) return expr;
  if (expr.startsWith('_ctx.')) return expr;
  if (/^\w+(\.\w+)*$/.test(expr)) return `${ctxPrefix}.${expr}`;
  if (/^\w+(\.\w+)*\s*\(/.test(expr)) return `${ctxPrefix}.${expr}`;
  if (expr.includes('=>')) return expr;

  // 复杂表达式：替换裸标识符
  const JS_KEYWORDS = new Set([
    'true', 'false', 'null', 'undefined', 'this', 'super',
    'new', 'delete', 'typeof', 'instanceof', 'in', 'of',
    'void', 'throw', 'return', 'yield', 'await', 'async',
    'if', 'else', 'for', 'while', 'do', 'switch', 'case',
    'break', 'continue', 'try', 'catch', 'finally',
    'class', 'extends', 'import', 'export', 'from', 'default',
    'var', 'let', 'const', 'function', 'debugger',
  ]);

  const GLOBALS = new Set([
    'console', 'window', 'document', 'Math', 'JSON', 'Date',
    'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp',
    'Error', 'Map', 'Set', 'Promise', 'Symbol',
    'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'NaN', 'Infinity',
  ]);

  const SPECIAL = new Set([
    '$event', '$refs', '$el', '$emit', '$slots', '$parent', '$root',
  ]);

  const placeholders: string[] = [];
  let processed = expr.replace(/(['"`])(?:(?!\1|\\).|\\.)*\1/g, (match) => {
    placeholders.push(match);
    return `__PH${placeholders.length - 1}__`;
  });

  processed = processed.replace(/(?<!_ctx\.)(?<!\w)(\w+(?:\.\w+)*)/g, (match) => {
    if (JS_KEYWORDS.has(match) || GLOBALS.has(match) || SPECIAL.has(match)) return match;
    if (/^\d/.test(match)) return match;
    if (/^__PH\d+__$/.test(match)) return match;
    return `${ctxPrefix}.${match}`;
  });

  for (let i = 0; i < placeholders.length; i++) {
    processed = processed.replace(`__PH${i}__`, placeholders[i]);
  }

  return processed;
}

function escapeStr(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function capitalize(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
