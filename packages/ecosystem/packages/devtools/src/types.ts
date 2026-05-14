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
 * 信号节点信息
 */
export interface SignalNode {
  id: string;
  name: string;
  type: 'signal' | 'computed' | 'effect';
  value?: unknown;
  previousValue?: unknown;
  dependencies: string[];
  dependents: string[];
  updateCount: number;
  lastUpdateTime: number;
  averageUpdateTime: number;
}

/**
 * 快照记录
 */
export interface Snapshot {
  id: string;
  timestamp: number;
  label?: string;
  signals: Record<string, SignalSnapshot>;
}

/**
 * 单个信号的快照
 */
export interface SignalSnapshot {
  value: unknown;
  dependencies: string[];
}

/**
 * 时间旅行状态
 */
export interface TimeTravelState {
  snapshots: Snapshot[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * 性能记录
 */
export interface PerformanceRecord {
  id: string;
  name: string;
  type: 'signal' | 'computed' | 'effect';
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * 依赖图节点
 */
export interface DependencyGraphNode {
  id: string;
  name: string;
  type: 'signal' | 'computed' | 'effect';
  x?: number;
  y?: number;
}

/**
 * 依赖图边
 */
export interface DependencyGraphEdge {
  source: string;
  target: string;
  type: 'dependency' | 'dependent';
}

/**
 * 依赖图
 */
export interface DependencyGraph {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
}

/**
 * 性能统计
 */
export interface PerformanceStats {
  totalRecords: number;
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
  byType: Record<string, { count: number; average: number; max: number }>;
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
