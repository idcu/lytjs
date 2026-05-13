/**
 * @lytjs/devtools - 类型定义
 */

import type { Component, VNode } from '@lytjs/vdom';

/**
 * DevTools 配置选项
 */
export interface DevToolsOptions {
  /** 是否启用 */
  enabled?: boolean;
  /** 面板位置 */
  position?: 'right' | 'bottom' | 'left';
  /** 面板宽度/高度 */
  size?: number;
}

/**
 * 组件树节点
 */
export interface ComponentTreeNode {
  id: string;
  name: string;
  props?: Record<string, any>;
  children?: ComponentTreeNode[];
  parent?: string;
}

/**
 * Store 状态信息
 */
export interface StoreStateInfo {
  id: string;
  state: Record<string, any>;
  getters?: Record<string, any>;
}

/**
 * 路由信息
 */
export interface RouteInfo {
  path: string;
  name?: string | null;
  params?: Record<string, string>;
  query?: Record<string, string>;
  matched: Array<{
    path: string;
    name?: string | null;
  }>;
}

/**
 * DevTools API
 */
export interface DevToolsAPI {
  /** 获取组件树 */
  getComponentTree(): ComponentTreeNode[];
  /** 获取 Store 状态 */
  getStoreStates(): StoreStateInfo[];
  /** 获取当前路由 */
  getCurrentRoute(): RouteInfo | null;
  /** 刷新 */
  refresh(): void;
}

export type { Component, VNode };
