// @lytjs/runtime-convergence - types
// L2 能力收敛模块的类型定义

import type { HostRect, HostEvent } from '@lytjs/host-contract';

// ============================================================
// VNode 相关类型（平台无关）
// ============================================================

/**
 * 平台无关的 VNode 接口。
 *
 * L2 层不依赖具体的 VNode 实现，仅使用此最小接口。
 */
export interface VNode {
  /** 节点类型标识 */
  type: string | symbol | object;
  /** 节点属性 */
  props: Record<string, unknown> | null;
  /** 子节点 */
  children: VNode[] | string | null;
  /** 关联的组件实例 */
  component?: ComponentInstance | null;
  /** 宿主节点引用（渲染后赋值） */
  el?: unknown;
  /** 锚点引用 */
  anchor?: unknown;
}

/**
 * 组件内部实例（最小接口）。
 *
 * L2 层仅需要组件实例的标识能力，用于资源注册表映射。
 */
export interface ComponentInstance {
  /** 组件唯一标识 */
  uid: number;
  /** 组件类型 */
  type: object;
  /** 是否已卸载 */
  isUnmounted: boolean;
  /** VNode 引用 */
  vnode: VNode;
  /** 父组件实例 */
  parent: ComponentInstance | null;
  /** 子树 VNode */
  subTree: VNode;
}

// ============================================================
// 渲染队列类型
// ============================================================

/**
 * 渲染操作类型。
 */
export type RenderOperation =
  | { type: 'insert'; vnode: VNode; container: unknown; anchor?: unknown }
  | { type: 'remove'; vnode: VNode }
  | { type: 'move'; vnode: VNode; container: unknown; anchor?: unknown }
  | { type: 'patch'; oldVNode: VNode; newVNode: VNode; container: unknown; anchor?: unknown }
  | { type: 'custom'; fn: () => void };

/**
 * 渲染队列配置项。
 */
export interface RenderQueueOptions {
  /** 是否启用操作合并（默认 true） */
  enableMerge?: boolean;
}

// ============================================================
// 事件归一化类型
// ============================================================

/**
 * 事件修饰符解析结果。
 */
export interface ParsedModifiers {
  /** 是否调用 stopPropagation */
  stop: boolean;
  /** 是否调用 preventDefault */
  prevent: boolean;
  /** 是否使用 capture 模式 */
  capture: boolean;
  /** 是否使用 once 模式 */
  once: boolean;
  /** 是否仅在 target === currentTarget 时触发 */
  self: boolean;
  /** 是否使用 passive 模式 */
  passive: boolean;
}

/**
 * 解析后的事件信息。
 */
export interface ParsedEventInfo {
  /** 规范化后的事件名（如 'click'） */
  name: string;
  /** 事件修饰符 */
  modifiers: ParsedModifiers;
}

/**
 * 事件 invoker 接口。
 *
 * 持有 value 属性用于更新，避免重复 addEventListener。
 */
export interface EventInvoker<HE> {
  /** 当前绑定的事件处理函数 */
  value: ((event: HostEvent) => void) | null;
  /** 解析后的事件信息 */
  parsed: ParsedEventInfo;
  /** 宿主元素引用 */
  el: HE;
  /** 实际的事件处理函数（传给 addEventListener 的函数） */
  handler: (event: HostEvent) => void;
  /** 取消监听函数 */
  dispose: () => void;
}

/**
 * 事件监听器注册条目。
 */
export interface EventListenerEntry<HE> {
  /** 宿主元素 */
  el: HE;
  /** 事件名 */
  event: string;
  /** 处理函数 */
  handler: (event: HostEvent) => void;
  /** 事件选项 */
  options?: { capture?: boolean; once?: boolean; passive?: boolean };
}

// ============================================================
// 节点缓存类型
// ============================================================

/**
 * 资源注册表条目。
 */
export interface ResourceEntry {
  /** 事件监听器列表 */
  eventListeners: EventListenerEntry<unknown>[];
  /** effect 订阅 dispose 列表 */
  effectDisposers: Array<() => void>;
  /** 通用清理回调列表 */
  cleanupHooks: Array<() => void>;
}

/**
 * 节点缓存配置项。
 */
export interface NodeCacheOptions {
  /** 是否启用 VNode 映射（默认 true） */
  enableVNodeMap?: boolean;
  /** 是否启用资源注册表（默认 true） */
  enableResourceRegistry?: boolean;
}

// ============================================================
// 异步调度器类型
// ============================================================

/**
 * 调度任务优先级。
 */
export type SchedulerPriority = 'sync' | 'high' | 'normal' | 'low';

/**
 * 调度任务。
 */
export interface SchedulerJob {
  /** 任务 ID */
  id: number;
  /** 任务函数 */
  fn: () => void;
  /** 优先级 */
  priority: SchedulerPriority;
  /** 是否允许合并（同一 tick 内仅执行一次） */
  allowMerge: boolean;
}

/**
 * 异步调度器配置项。
 */
export interface AsyncSchedulerOptions {
  /** 默认优先级（默认 'normal'） */
  defaultPriority?: SchedulerPriority;
  /** 是否启用同步插队（默认 true） */
  enableFlushSync?: boolean;
}

// ============================================================
// 过渡引擎类型
// ============================================================

/**
 * 过渡属性（平台无关）。
 */
export interface TransitionProps<HE> {
  /** 过渡名称前缀（默认 'v'） */
  name?: string;
  /** 是否在首次挂载时执行 appear 过渡 */
  appear?: boolean;
  /** 过渡模式 */
  mode?: 'in-out' | 'out-in' | 'default';
  /** 进入起始类名 */
  enterFromClass?: string;
  /** 进入激活类名 */
  enterActiveClass?: string;
  /** 进入结束类名 */
  enterToClass?: string;
  /** 离开起始类名 */
  leaveFromClass?: string;
  /** 离开激活类名 */
  leaveActiveClass?: string;
  /** 离开结束类名 */
  leaveToClass?: string;
  /** 进入前回调 */
  onBeforeEnter?: (el: HE) => void;
  /** 进入回调（done 用于通知完成） */
  onEnter?: (el: HE, done: () => void) => void;
  /** 进入完成回调 */
  onAfterEnter?: (el: HE) => void;
  /** 进入取消回调 */
  onEnterCancelled?: (el: HE) => void;
  /** 离开前回调 */
  onBeforeLeave?: (el: HE) => void;
  /** 离开回调（done 用于通知完成） */
  onLeave?: (el: HE, done: () => void) => void;
  /** 离开完成回调 */
  onAfterLeave?: (el: HE) => void;
  /** 离开取消回调 */
  onLeaveCancelled?: (el: HE) => void;
}

/**
 * 过渡状态。
 */
export interface TransitionState {
  /** 当前过渡阶段 */
  phase: 'idle' | 'entering' | 'leaving';
  /** 是否已取消 */
  cancelled: boolean;
  /** 过渡完成回调 */
  doneCallback: (() => void) | null;
}

/**
 * FLIP 动画的四个阶段记录。
 */
export interface FLIPRecord<HE> {
  /** 目标元素 */
  el: HE;
  /** First: 初始位置 */
  first: HostRect;
  /** Last: 最终位置 */
  last: HostRect;
  /** Invert: 偏移量 */
  invert: { x: number; y: number };
  /** Play: 播放回调 */
  play: (() => void) | null;
}

/**
 * 过渡类名解析结果。
 */
export interface ResolvedTransitionClasses {
  /** 起始类名 */
  from: string;
  /** 激活类名 */
  active: string;
  /** 结束类名 */
  to: string;
}

/**
 * 过渡引擎配置项。
 */
export interface TransitionEngineOptions {
  /** 默认过渡名称（默认 'v'） */
  defaultName?: string;
  /** 过渡超时时间（ms，默认 5000） */
  timeout?: number;
  /** 是否启用 FLIP 动画（默认 true） */
  enableFLIP?: boolean;
}
