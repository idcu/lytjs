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
import { findDirective, getExpContent, setMemoMeta, MEMO_KEY } from './helpers';
import type { VMemoMeta } from './helpers';
import { transformElement } from './transform-element';

// 元数据定义与存取移到 helpers.ts（transform-element 与 codegen 都需要读取，
// 放在本模块会产生 v-memo ↔ transform-element 的循环依赖）。
export type { VMemoMeta };
export { MEMO_KEY };
export { getMemoMeta } from './helpers';

// FIX: P2-28 移除模块级 memoCounter，改用 TransformContext.__counters
// 避免多个编译上下文共享同一计数器导致变量名冲突
// 原模块级计数器已迁移到 context.__counters.memo

/**
 * 获取 memo 计数器的当前值（用于测试）
 * FIX: P2-28 现在从 context 中读取计数器值
 */
export function getMemoCounter(context: TransformContext): number {
  return context.__counters?.memo ?? 0;
}

/**
 * 重置 memo 计数器（用于测试）
 * FIX: P2-28 现在通过修改 context.__counters 来重置计数器
 */
export function resetMemoCounter(context: TransformContext): void {
  if (!context.__counters) {
    context.__counters = {};
  }
  context.__counters.memo = 0;
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
): void | (() => void) {
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

  // FIX: P2-28 使用 TransformContext.__counters 生成唯一的缓存变量名
  const memoCounter = context.__counters?.memo ?? 0;
  if (!context.__counters) {
    context.__counters = {};
  }
  context.__counters.memo = memoCounter + 1;
  const cacheKey = `_memo_${memoCounter}`;

  // 存储依赖信息到节点元数据
  setMemoMeta(element, {
    deps: depsContent,
    cacheKey,
    index: memoCounter,
  });

  // 从 props 中移除 v-memo 指令
  element.props = element.props.filter(
    (p) => !(p.type === NodeTypes.DIRECTIVE && p.name === 'memo'),
  );

  // 注册 helper
  context.helper('WITH_MEMO');

  // 正常转换元素（推迟到 exit：子节点遍历完成后才能拿到它们的 codegenNode）
  return () => {
    transformElement(element, context, { sync: true });
  };
}
