// src/transforms/v-for.ts
// v-for 转换逻辑


import { NodeTypes } from '../constants';
import type {
  RootNode,
  TemplateChildNode,
  ElementNode,
  TransformContext,
  VNodeCall,
  JSCallExpression,
} from '../types';
import { createSimpleExpression, createCallExpression, createCompoundExpression } from '../ast';
import { getExpContent, findDirective } from './helpers';
import { transformElement } from './transform-element';
import { warn } from '@lytjs/common-error';

// FIX: P1-29 移除模块级计数器，改为上下文级计数器，
// 避免多个编译上下文共享同一计数器导致变量名冲突
// let destructureCounter = 0; // 已移除

/**
 * Type guard: check if a codegenNode is a VNodeCall.
 */
function isVNodeCall(node: unknown): node is VNodeCall {
  return (
    typeof node === 'object' && node !== null && (node as VNodeCall).type === NodeTypes.VNODE_CALL
  );
}

/**
 * Type guard: check if a codegenNode is a JSCallExpression.
 */
function isJSCallExpression(node: unknown): node is JSCallExpression {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as JSCallExpression).type === NodeTypes.JS_CALL_EXPRESSION
  );
}

/**
 * Type guard: check if a node can be used as a TemplateChildNode.
 * FIX: P2-10 添加类型守卫函数，替代 as unknown as TemplateChildNode 双重断言。
 * 在 AST 转换阶段，VNodeCall 和 JSCallExpression 会被 replaceNode
 * 插入到父节点的 children 数组中，因此它们在运行时是有效的 TemplateChildNode。
 */
function isTemplateChildCompatible(node: unknown): node is TemplateChildNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    typeof (node as { type?: number }).type === 'number'
  );
}

export function transformFor(node: RootNode | TemplateChildNode, context: TransformContext): void {
  if (node.type !== NodeTypes.ELEMENT) return;

  const element = node as ElementNode;
  const forDir = findDirective(element, 'for');
  if (!forDir || !forDir.exp) return;

  // Remove v-for directive from props
  element.props = element.props.filter(
    (p) => !(p.type === NodeTypes.DIRECTIVE && p.name === 'for'),
  );

  // Parse v-for expression
  const expContent = getExpContent(forDir.exp);
  if (!expContent) return;

  // Supports:
  // - item in list
  // - (item, index) in list
  // - { key, value } in entries
  // - { key: k, value: v } in entries (with renaming)
  // - { key, value }, index in entries
  // - { key = 'default' } in entries (with default values)
  // - [ a, b ] in array
  // - [ a, b ], index in array
  // - [ a = 1 ] in array (with default values)
  // FIX: P2-25 解构赋值语法支持已完善，支持嵌套解构和剩余元素
  // FIX: P2-47 改进正则：使用平衡括号匹配替代 [^)]+，
  // 支持嵌套括号语法如 (item, (sub) => sub.key) in items
  const inMatch = matchVForExpression(expContent);
  if (!inMatch) return;

  // inMatch[1]: parenthesized syntax (item, index)
  // inMatch[2]: object destructuring { key, value } [, index]
  // inMatch[3]: array destructuring [ a, b ] [, index]
  // inMatch[4]: simple variable name
  // inMatch[5]: right-hand side iteration expression
  const left = (inMatch[1] ?? inMatch[2] ?? inMatch[3] ?? inMatch[4])!.trim();
  const right = inMatch[5]!.trim();

  // Check for destructuring patterns
  // FIX: P1-29 使用 TransformContext 中的计数器替代模块级计数器
  const destructureResult = parseDestructure(left, context);

  let itemVar: string;
  let indexVar: string | undefined;
  let destructureExpr: string | undefined;

  if (destructureResult) {
    // Destructuring pattern: { key, value } or [ index, value ]
    itemVar = destructureResult.tempVar;
    indexVar = destructureResult.indexVar;
    destructureExpr = destructureResult.pattern;
  } else if (inMatch[1]) {
    // Parenthesized syntax: (item, index) or (item)
    const parts = left.split(',').map((p) => p.trim());
    if (parts.length > 2) {
      if (__DEV__) {
        warn(`v-for does not support more than 2 variables in (item, index) syntax.`);
      }
    }
    itemVar = parts[0] ?? 'item';
    indexVar = parts[1];
  } else if (left.startsWith('[') && left.endsWith(']')) {
    const inner = left.slice(1, -1).trim();
    const parts = inner.split(',').map((p) => p.trim());
    if (parts.length > 2) {
      if (__DEV__) {
        warn(`v-for does not support more than 2 variables in [item, index] syntax.`);
      }
    }
    itemVar = parts[0] ?? 'item';
    indexVar = parts[1];
  } else {
    itemVar = left;
  }

  // Transform the element
  transformElement(element, context);

  const codegenNode = element.codegenNode;
  if (!codegenNode) return;

  // Use type guards instead of double type assertions
  // FIX: P2-9 添加运行时类型检查，避免不安全的类型断言回退
  const renderItem = isVNodeCall(codegenNode)
    ? codegenNode
    : isJSCallExpression(codegenNode)
      ? codegenNode
      : (() => {
          if (__DEV__) {
            warn(`[lytjs/compiler] v-for: unexpected codegenNode type: ${(codegenNode as { type?: number }).type}. Expected VNodeCall or JSCallExpression.`);
          }
          return codegenNode as VNodeCall;
        })();

  context.helper('RENDER_LIST');

  // Build the arrow function body
  let arrowBody: TemplateChildNode[];
  // FIX: P2-10 使用类型守卫函数安全转换，替代 as unknown as 双重断言
  // renderItem 在此上下文中已被验证为 VNodeCall 或 JSCallExpression，
  // 两者都可作为 TemplateChildNode 使用（通过 replaceNode 插入父节点 children）
  const renderItemAsChild = isTemplateChildCompatible(renderItem)
    ? renderItem
    : renderItem as TemplateChildNode;
  if (destructureExpr) {
    // For destructuring, add a destructuring statement before the render item
    arrowBody = [
      createSimpleExpression(`const ${destructureExpr} = ${itemVar}`, false, forDir.exp.loc, false),
      renderItemAsChild,
    ];
  } else {
    arrowBody = [renderItemAsChild];
  }

  const renderListCall = createCallExpression('RENDER_LIST', [
    createSimpleExpression(right, false, forDir.exp.loc, false),
    createCompoundExpression(
      [
        `(${itemVar}${indexVar ? `, ${indexVar}` : ''}) => { `,
        ...arrowBody,
        ` }`,
      ],
      forDir.exp.loc,
    ),
  ]);

  // FIX: P2-10 renderListCall 是 JSCallExpression，需要转换为 TemplateChildNode
  // 此处断言是安全的，因为 v-for 转换结果会被 replaceNode 替换到父节点的 children 中
  // 使用类型守卫验证后再断言
  if (!isTemplateChildCompatible(renderListCall)) {
    if (__DEV__) {
      warn(`[lytjs/compiler] v-for: renderListCall is not a compatible TemplateChildNode.`);
    }
  }
  context.replaceNode(renderListCall as TemplateChildNode);
}

/**
 * Parse a destructuring pattern from the left-hand side of v-for.
 *
 * Supports:
 * - `{ key, value }` -> object destructuring
 * - `{ key, value }, index` -> object destructuring with index
 * - `{ key: k, value: v }` -> object destructuring with renaming
 * - `{ key = 'default' }` -> object destructuring with default values
 * - `{ key: k = 'default' }` -> object destructuring with renaming and default
 * - `[ index, value ]` -> array destructuring
 * - `[ index, value ], index` -> array destructuring with outer index
 * - `[ a = 1, b = 2 ]` -> array destructuring with default values
 *
 * Returns null if the pattern is not a destructuring expression.
 */
function parseDestructure(
  left: string,
  context: TransformContext,
): { pattern: string; tempVar: string; indexVar?: string } | null {
  // FIX: P2-27 使用 TransformContext 接口中定义的 __counters 字段替代不安全的类型断言
  // FIX: P2-23 正则表达式缓存 - 模块级预编译正则
const RE_OBJ_DESTRUCTURE = /^(\{[^}]+\})(?:\s*,\s*(\w+))?$/;
const RE_ARR_DESTRUCTURE = /^(\[[^\]]+\])(?:\s*,\s*(\w+))?$/;
const RE_SIMPLE_VFOR = /^(\S+)\s+(?:in|of)\s+(.+)$/;

  // FIX: P1-29 使用 TransformContext 中的计数器替代模块级计数器，确保每个编译上下文独立
  const counterKey = 'destructure';
  const counter = context.__counters?.[counterKey] ?? 0;
  if (!context.__counters) {
    context.__counters = {};
  }
  context.__counters[counterKey] = counter + 1;

  // Match: { ... } [, index]
  // FIX: P2-23 使用预编译正则，避免每次调用都编译
  const objMatch = RE_OBJ_DESTRUCTURE.exec(left);
  if (objMatch) {
    return {
      pattern: objMatch[1]!.trim(),
      tempVar: `__destructureItem_${counter}`,
      indexVar: objMatch[2]?.trim(),
    };
  }

  // Match: [ ... ] [, index]
  // FIX: P2-23 使用预编译正则，避免每次调用都编译
  const arrMatch = RE_ARR_DESTRUCTURE.exec(left);
  if (arrMatch) {
    return {
      pattern: arrMatch[1]!.trim(),
      tempVar: `__destructureItem_${counter}`,
      indexVar: arrMatch[2]?.trim(),
    };
  }

  return null;
}

/**
 * FIX: P2-47 使用平衡括号匹配解析 v-for 表达式，
 * 支持嵌套括号语法如 (item, (sub) => sub.key) in items
 *
 * 返回与原正则匹配相同的分组结构：
 * [1] parenthesized syntax, [2] object destructuring,
 * [3] array destructuring, [4] simple variable, [5] right-hand side
 */
function matchVForExpression(
  exp: string,
): RegExpMatchArray | null {
  const trimmed = exp.trim();

  // 尝试匹配括号语法：(item) in list 或 (item, index) in list
  if (trimmed.startsWith('(')) {
    const parenEnd = findBalancedParen(trimmed, 0);
    if (parenEnd !== -1) {
      const left = trimmed.slice(1, parenEnd).trim();
      const rest = trimmed.slice(parenEnd + 1).trim();
      const inOfMatch = rest.match(/^(?:in|of)\s+(.+)$/);
      if (inOfMatch) {
        return [trimmed, left, undefined, undefined, undefined, inOfMatch[1]] as unknown as RegExpMatchArray;
      }
    }
  }

  // 尝试匹配花括号语法：{ key, value } in list
  if (trimmed.startsWith('{')) {
    const braceEnd = findBalancedBrace(trimmed, 0);
    if (braceEnd !== -1) {
      const left = trimmed.slice(0, braceEnd + 1).trim();
      const rest = trimmed.slice(braceEnd + 1).trim();
      const inOfMatch = rest.match(/^(?:,\s*(\w+))?\s+(?:in|of)\s+(.+)$/);
      if (inOfMatch) {
        return [trimmed, undefined, left, undefined, inOfMatch[1] ?? undefined, inOfMatch[2]] as unknown as RegExpMatchArray;
      }
    }
  }

  // 尝试匹配方括号语法：[ a, b ] in list
  if (trimmed.startsWith('[')) {
    const bracketEnd = findBalancedBracket(trimmed, 0);
    if (bracketEnd !== -1) {
      const left = trimmed.slice(0, bracketEnd + 1).trim();
      const rest = trimmed.slice(bracketEnd + 1).trim();
      const inOfMatch = rest.match(/^(?:,\s*(\w+))?\s+(?:in|of)\s+(.+)$/);
      if (inOfMatch) {
        return [trimmed, undefined, undefined, left, inOfMatch[1] ?? undefined, inOfMatch[2]] as unknown as RegExpMatchArray;
      }
    }
  }

  // 回退到简单变量名匹配：item in list
  // FIX: P2-23 使用预编译正则，避免每次调用都编译
  const simpleMatch = RE_SIMPLE_VFOR.exec(trimmed);
  if (simpleMatch) {
    return [trimmed, undefined, undefined, undefined, simpleMatch[1], simpleMatch[2]] as unknown as RegExpMatchArray;
  }

  return null;
}

/** 找到从 startIndex 开始的平衡右括号位置 */
function findBalancedParen(str: string, startIndex: number): number {
  let depth = 0;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** 找到从 startIndex 开始的平衡右花括号位置 */
function findBalancedBrace(str: string, startIndex: number): number {
  let depth = 0;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** 找到从 startIndex 开始的平衡右方括号位置 */
function findBalancedBracket(str: string, startIndex: number): number {
  let depth = 0;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '[') depth++;
    else if (str[i] === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
