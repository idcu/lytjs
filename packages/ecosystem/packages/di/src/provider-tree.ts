// packages/ecosystem/packages/di/src/provider-tree.ts
// 通用依赖注入 - Provider 树生命周期管理

import { getProviderScopeFactory } from './scope';
import type { ProviderScope } from './scope';
import type { ProviderRecord } from './types';

/**
 * Provider 树节点
 * 支持嵌套的 Provider 层级结构
 */
export interface ProviderNode {
  /** 唯一标识 */
  id: symbol;
  /** 父节点 */
  parent: ProviderNode | null;
  /** 子节点 */
  children: Set<ProviderNode>;
  /** 提供的值 */
  providers: Map<string | symbol, ProviderRecord>;
  /** 作用域 */
  scope: ProviderScope;
}

/** 全局 Provider 根节点 */
let globalProviderRoot: ProviderNode | null = null;

/** 当前 Provider 上下文 */
let currentProviderNode: ProviderNode | null = null;

/**
 * 进入作用域前的上下文栈。
 *
 * ⚠️ 2026-11-03 修（P0）：此前 `exitProviderScope()` 恢复的是
 *   `currentProviderNode.parent`，而 `enterProviderScope()` 在 `current` 为 null 时
 *   会把**自动创建的全局根节点**当作 parent ⇒ 退出后 `current` 停在 root，
 *   **而不是回到 null**（实测）。
 *
 *   后果：作用域外调用 `getCurrentProviderNode()` 会拿到全局根节点 ⇒
 *   `provideValue()` 直接写进**进程级**根节点 ⇒ SSR 下跨请求泄漏。
 *
 *   现在用显式栈记录「进入前的值」，退出时精确恢复。
 */
const contextStack: (ProviderNode | null)[] = [];

/**
 * 创建 Provider 节点
 */
export function createProviderNode(parent: ProviderNode | null = null): ProviderNode {
  const node: ProviderNode = {
    id: Symbol('provider-node'),
    parent,
    children: new Set(),
    providers: new Map(),
    scope: getProviderScopeFactory()(),
  };

  if (parent) {
    parent.children.add(node);
  }

  return node;
}

/**
 * 获取或创建全局 Provider 根节点
 */
export function getProviderRoot(): ProviderNode {
  if (!globalProviderRoot) {
    globalProviderRoot = createProviderNode();
  }
  return globalProviderRoot;
}

/**
 * 获取当前活跃的全局 Provider 根节点（不创建）
 */
export function getActiveProviderRoot(): ProviderNode | null {
  return globalProviderRoot;
}

/**
 * 进入新的 Provider 作用域
 */
export function enterProviderScope(): ProviderNode {
  // 记录进入前的上下文（可能是 null）
  contextStack.push(currentProviderNode);
  const parent = currentProviderNode || getProviderRoot();
  currentProviderNode = createProviderNode(parent);
  return currentProviderNode;
}

/**
 * 退出当前 Provider 作用域
 */
export function exitProviderScope(): void {
  const node = currentProviderNode;
  if (!node) return;

  // 只有 enterProviderScope 创建的节点才归 exit 管；全局根节点不是作用域
  const isScopeNode = contextStack.length > 0;
  if (isScopeNode) {
    node.scope.stop();
    node.parent?.children.delete(node);
    currentProviderNode = contextStack.pop() ?? null;
  }
}

/**
 * 获取当前 Provider 节点
 */
export function getCurrentProviderNode(): ProviderNode | null {
  return currentProviderNode;
}

/**
 * 创建一个 Provider 作用域并执行回调
 */
export function withProviderScope<T>(fn: () => T): T {
  const node = enterProviderScope();
  try {
    return node.scope.run(fn) as T;
  } finally {
    exitProviderScope();
  }
}

/**
 * 重置 Provider 树（主要用于测试）
 */
export function resetProviderScope(): void {
  // ★ 2026-11-03：停止残留作用域，避免 effect scope / 定时器等资源泄漏。
  //   此前只是把引用置空，**没有 stop** ⇒ 每个 scope 里注册的清理逻辑都不会执行。
  currentProviderNode?.scope.stop();
  globalProviderRoot?.scope.stop();

  contextStack.length = 0;
  globalProviderRoot = null;
  currentProviderNode = null;
}
