// src/transforms/v-memo.ts
// v-memo 指令转换逻辑
//
// v-memo 用于记忆化子树的渲染结果，只有当依赖值变化时才重新渲染。
// 用法：<div v-memo="[count, name]">{{ count }} - {{ name }}</div>
//
// 实现策略：
// 1. 在 transform 阶段检测 v-memo 指令
// 2. 提取依赖数组表达式，存储为节点的 memoDeps 元信息
// 3. 移除 v-memo 指令，正常执行 transformElement
// 4. 在 codegen 阶段（通过 patchFlag 标记）告知运行时使用缓存比较

import { NodeTypes } from '../constants';
import type {
  RootNode,
  TemplateChildNode,
  ElementNode,
  TransformContext,
  ExpressionNode,
} from '../types';
import { findDirective, getExpContent } from './helpers';
import { transformElement } from './transform-element';

/**
 * v-memo 依赖信息，附加到 ElementNode 的 props 中作为隐藏元数据。
 * 通过在 props 中注入一个特殊的标记属性，让 codegen 阶段可以识别
 * 并生成对应的缓存比较逻辑。
 */
export interface VMemoMeta {
  /** 依赖数组表达式字符串，例如 "[count, name]" */
  deps: string;
  /** 缓存变量名，例如 "_memo_0" */
  cacheKey: string;
}

/**
 * 将 v-memo 依赖信息存储到 ElementNode 上。
 * 使用 Symbol 作为 key 避免与正常属性冲突。
 */
export const MEMO_KEY = Symbol('__v_memo__');

/**
 * 从 ElementNode 上获取 v-memo 依赖信息。
 */
export function getMemoMeta(node: ElementNode): VMemoMeta | undefined {
  return (node as unknown as Record<symbol, VMemoMeta | undefined>)[MEMO_KEY];
}

/**
 * 为 ElementNode 设置 v-memo 依赖信息。
 */
function setMemoMeta(node: ElementNode, meta: VMemoMeta): void {
  (node as unknown as Record<symbol, VMemoMeta>)[MEMO_KEY] = meta;
}

/** 全局计数器，用于生成唯一的缓存变量名 */
let memoCounter = 0;

/**
 * 重置 memo 计数器（用于测试）
 */
export function resetMemoCounter(): void {
  memoCounter = 0;
}

/**
 * v-memo 转换函数（NodeTransform）
 *
 * 处理流程：
 * 1. 检测元素上的 v-memo 指令
 * 2. 提取依赖数组表达式
 * 3. 将依赖信息存储为节点元数据
 * 4. 移除 v-memo 指令
 * 5. 正常执行 transformElement
 */
export function transformVMemo(
  node: RootNode | TemplateChildNode,
  context: TransformContext,
): void {
  if (node.type !== NodeTypes.ELEMENT) return;

  const element = node as ElementNode;
  const memoDir = findDirective(element, 'memo');
  if (!memoDir) return;

  // 提取依赖数组表达式
  const depsExpr = memoDir.exp;
  const depsContent = getExpContent(depsExpr as ExpressionNode | null | undefined);

  if (!depsContent) {
    context.error('v-memo requires an array expression as its value', element);
    return;
  }

  // 生成唯一的缓存变量名
  const cacheKey = `_memo_${memoCounter++}`;

  // 存储依赖信息到节点元数据
  setMemoMeta(element, {
    deps: depsContent,
    cacheKey,
  });

  // 从 props 中移除 v-memo 指令
  element.props = element.props.filter(
    (p) => !(p.type === NodeTypes.DIRECTIVE && p.name === 'memo'),
  );

  // 注册 helper
  context.helper('WITH_MEMO');

  // 正常转换元素
  transformElement(element, context);
}
