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
  const parent = currentProviderNode || getProviderRoot();
  currentProviderNode = createProviderNode(parent);
  return currentProviderNode;
}

/**
 * 退出当前 Provider 作用域
 */
export function exitProviderScope(): void {
  if (currentProviderNode && currentProviderNode.parent) {
    currentProviderNode.scope.stop();
    currentProviderNode.parent.children.delete(currentProviderNode);
    currentProviderNode = currentProviderNode.parent;
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
  globalProviderRoot = null;
  currentProviderNode = null;
}