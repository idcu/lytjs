// src/transforms/helpers.ts
// 共享辅助函数

import { NodeTypes } from '../constants';
import type {
  ElementNode,
  DirectiveNode,
  ExpressionNode,
  TemplateChildNode,
  CompoundExpressionNode,
  JSProperty,
  JSConditionalExpression,
  SimpleExpressionNode,
} from '../types';

/**
 * 获取表达式节点的内容字符串
 * @param exp - 表达式节点，如果为 null 或 undefined 则直接返回 undefined
 * @returns 表达式内容字符串，或 undefined
 *
 * FIX: P2-48 添加对 COMPOUND_EXPRESSION 类型的处理，
 * 将复合表达式的所有子节点拼接为字符串返回
 */
export function getExpContent(exp: ExpressionNode | null | undefined): string | undefined {
  if (exp == null) return undefined;
  if (exp.type === NodeTypes.SIMPLE_EXPRESSION) return exp.content;
  if (exp.type === NodeTypes.COMPOUND_EXPRESSION) {
    return (exp as CompoundExpressionNode).children
      .map((c) => {
        if (typeof c === 'string') return c;
        if (c.type === NodeTypes.SIMPLE_EXPRESSION) return c.content;
        return '';
      })
      .join('');
  }
  return undefined;
}

/**
 * 识别 `handleVShow` 产出的 `style: (cond) ? undefined : { display: 'none' }`。
 *
 * signal 的「分支内静态 HTML + 动态 op」路径只认简单表达式，会直接跳过这个
 * 条件表达式（C-09：分支内 v-show 整条丢失）。返回条件表达式内容，供两条
 * emitter 改写成 `display: cond ? '' : 'none'`。
 */
export function getVShowStyleTest(prop: JSProperty): string | undefined {
  const value = prop.value;
  if (!value || value.type !== NodeTypes.JS_CONDITIONAL_EXPRESSION) return undefined;
  const cond = value as JSConditionalExpression;
  const test = cond.test as { type?: number; content?: string };
  if (!test || test.type !== NodeTypes.SIMPLE_EXPRESSION || typeof test.content !== 'string') {
    return undefined;
  }
  const cons = cond.consequent as { type?: number; content?: string };
  if (!cons || cons.type !== NodeTypes.SIMPLE_EXPRESSION || cons.content !== 'undefined') {
    return undefined;
  }
  const alt = cond.alternate as { type?: number; properties?: JSProperty[] };
  if (!alt || alt.type !== NodeTypes.JS_OBJECT_EXPRESSION) return undefined;
  const props = alt.properties ?? [];
  if (props.length !== 1) return undefined;
  const only = props[0]!;
  if (only.type !== NodeTypes.JS_PROPERTY) return undefined;
  const key = only.key as SimpleExpressionNode;
  const val = only.value as SimpleExpressionNode;
  if (key.type !== NodeTypes.SIMPLE_EXPRESSION || key.content !== 'display') return undefined;
  if (val.type !== NodeTypes.SIMPLE_EXPRESSION || val.content !== "'none'") return undefined;
  return test.content;
}

// ============================================================
// v-memo 元数据（transform 与 codegen 共享；放在 helpers 里避免
// transform-element ↔ v-memo 的循环依赖）
// ============================================================

/** 挂在 ElementNode 上的 memo 元数据键 */
export const MEMO_KEY = Symbol('__v_memo__');
/** 挂在 codegen 节点上的 memo 元数据键（由 transformElement 从元素转移过来） */
export const MEMO_CODEGEN_KEY = Symbol('__v_memo_codegen__');

export interface VMemoMeta {
  /** 依赖数组表达式字符串，例如 "[count, name]" */
  deps: string;
  /** 缓存变量名，例如 "_memo_0" */
  cacheKey: string;
  /** 静态缓存槽位（plain 元素 / v-if 分支） */
  index: number;
  /** 动态缓存槽位表达式（v-for 的循环下标）；存在时优先于 index */
  indexExpr?: string;
}

type MemoCarrier = { [MEMO_KEY]?: VMemoMeta };

export function getMemoMeta(node: ElementNode): VMemoMeta | undefined {
  return (node as ElementNode & MemoCarrier)[MEMO_KEY];
}

export function setMemoMeta(node: ElementNode, meta: VMemoMeta): void {
  (node as ElementNode & MemoCarrier)[MEMO_KEY] = meta;
}

/** 把 memo 元数据转移到 vnode codegen 节点（codegen 阶段据此外包 withMemo） */
export function attachMemoToCodegen(node: object, meta: VMemoMeta): void {
  (node as Record<symbol, VMemoMeta>)[MEMO_CODEGEN_KEY] = meta;
}

export function getCodegenMemo(node: unknown): VMemoMeta | undefined {
  if (node == null || typeof node !== 'object') return undefined;
  return (node as Record<symbol, VMemoMeta | undefined>)[MEMO_CODEGEN_KEY];
}

export function detachMemoFromCodegen(node: unknown): void {
  if (node == null || typeof node !== 'object') return;
  delete (node as Record<symbol, VMemoMeta | undefined>)[MEMO_CODEGEN_KEY];
}

/**
 * 在元素节点中查找指定名称的指令
 */
export function findDirective(node: ElementNode, name: string): DirectiveNode | undefined {
  return node.props.find(
    (p): p is DirectiveNode => p.type === NodeTypes.DIRECTIVE && p.name === name,
  );
}

/**
 * 判断节点是否为 JS 类型节点（codegen 阶段的节点类型）。
 *
 * 注意：此函数不包含表达式节点（SIMPLE_EXPRESSION、COMPOUND_EXPRESSION），
 * 因为表达式节点属于模板层节点，在 transform 阶段仍需要作为 TemplateChildNode 处理，
 * 而非直接作为 codegen 节点使用。
 */
export function isJS(node: TemplateChildNode): boolean {
  return (
    node.type === NodeTypes.JS_CALL_EXPRESSION ||
    node.type === NodeTypes.JS_OBJECT_EXPRESSION ||
    node.type === NodeTypes.JS_PROPERTY ||
    node.type === NodeTypes.JS_ARRAY_EXPRESSION ||
    node.type === NodeTypes.JS_FUNCTION_EXPRESSION ||
    node.type === NodeTypes.JS_CONDITIONAL_EXPRESSION ||
    node.type === NodeTypes.JS_CACHE_EXPRESSION ||
    node.type === NodeTypes.VNODE_CALL
  );
}
