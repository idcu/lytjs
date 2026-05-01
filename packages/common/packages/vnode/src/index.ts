/**
 * @lytjs/common-vnode
 * VNode 类型定义与常量
 */

// ============================================================
// VNode 类型 Symbol
// ============================================================

export const Fragment = Symbol.for("Fragment");
export const Text = Symbol.for("Text");
export const Comment = Symbol.for("Comment");

// ============================================================
// ShapeFlags - VNode 形状标志
// ============================================================

export const enum ShapeFlags {
  /** HTML 元素或 SVG 元素 */
  ELEMENT = 1,
  /** 函数式组件 */
  FUNCTIONAL_COMPONENT = 1 << 1,
  /** 有状态组件 */
  STATEFUL_COMPONENT = 1 << 2,
  /** 子节点是文本 */
  TEXT_CHILDREN = 1 << 3,
  /** 子节点是数组 */
  ARRAY_CHILDREN = 1 << 4,
  /** 子节点是插槽 */
  SLOTS_CHILDREN = 1 << 5,
  /** Suspense 组件 */
  SUSPENSE = 1 << 6,
  /** Teleport 组件 */
  TELEPORT = 1 << 7,
  /** 组件应该被 keep-alive */
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
  /** 组件已被 keep-alive */
  COMPONENT_KEPT_ALIVE = 1 << 9,
}

// ============================================================
// PatchFlags - 补丁标志
// ============================================================

export const enum PatchFlags {
  /** 动态文本内容 */
  TEXT = 1,
  /** 动态 class */
  CLASS = 1 << 1,
  /** 动态 style */
  STYLE = 1 << 2,
  /** 动态 props（非 class 和 style） */
  PROPS = 1 << 3,
  /** 有动态的 key 的 props，需要完整 diff */
  FULL_PROPS = 1 << 4,
  /** 有事件监听器 */
  HYDRATE_EVENTS = 1 << 5,
  /** 子节点顺序不会改变，是稳定的 fragment */
  STABLE_FRAGMENT = 1 << 6,
  /** 子节点带有 key 的 fragment */
  KEYED_FRAGMENT = 1 << 7,
  /** 子节点没有 key 的 fragment */
  UNKEYED_FRAGMENT = 1 << 8,
  /** 非 props 的 patch，如 ref 或 directives */
  NEED_PATCH = 1 << 9,
  /** 动态插槽 */
  DYNAMIC_SLOTS = 1 << 10,
  /** 静态节点，可提升 */
  HOISTED = -1,
  /** 指示 diff 算法应退出优化模式 */
  BAIL = -2,
}

// ============================================================
// VNode 类型定义
// ============================================================

export type VNodeTypes =
  | string
  | typeof Fragment
  | typeof Text
  | typeof Comment
  | object; // Component

export type VNodeChildren =
  | string
  | number
  | boolean
  | null
  | undefined
  | VNode[]
  | { [key: string]: VNode[] };

export interface VNodeSourceLocation {
  start: { line: number; column: number; offset: number };
  end: { line: number; column: number; offset: number };
  source: string;
}

export interface VNodeData {
  [key: string]: unknown;
}

export interface VNode {
  /** VNode 类型 */
  type: VNodeTypes;
  /** VNode 的 key */
  key: string | number | symbol | null | undefined;
  /** ref 引用 */
  ref: ((ref: unknown) => void) | null;
  /** VNode 的 props（可选，直接存储在 VNode 上） */
  props: Record<string, unknown> | null;
  /** 是否为静态提升 */
  isStatic: boolean;
  /** 是否为静态根节点 */
  isStaticRoot: boolean;
  /** 是否为 once 渲染 */
  isOnce: boolean;
  /** 是否为异步占位 */
  isAsyncPlaceholder: boolean;
  /** 是否为注释节点 */
  isComment: boolean;
  /** 是否为克隆节点 */
  isCloned: boolean;
  /** 是否为块级元素 */
  isBlockTree: boolean;
  /** 形状标志 */
  shapeFlag: number;
  /** 补丁标志 */
  patchFlag: number;
  /** 动态 props */
  dynamicProps: string[] | null;
  /** 动态子节点 */
  dynamicChildren: VNode[] | null;
  /** 子节点 */
  children: VNodeChildren;
  /** 组件实例 */
  component: ComponentInternalInstance | null;
  /** 挂载的 DOM 元素 */
  el: Node | null;
  /** 锚点元素 */
  anchor: Node | null;
  /** 目标元素（Teleport） */
  target: Element | null;
  /** 目标锚点（Teleport） */
  targetAnchor: Node | null;
  /** 目标起始位置（Teleport） */
  targetStart: Node | null;
  /** 源码位置 */
  loc: VNodeSourceLocation | null;
  /** 内部标记 */
  __v_isVNode: true;
}

export interface ComponentPublicInstance {
  $props: Record<string, unknown>;
  $attrs: Record<string, unknown>;
  $refs: Record<string, unknown>;
  $slots: Record<string, unknown>;
  $emit: (event: string, ...args: unknown[]) => void;
  $el: Element | ComponentPublicInstance | null;
  $forceUpdate: () => void;
  $nextTick: (fn?: () => void) => Promise<void>;
}

export interface ComponentInternalInstance {
  uid: number;
  type: VNodeTypes;
  parent: ComponentInternalInstance | null;
  root: ComponentInternalInstance;
  vnode: VNode;
  subTree: VNode;
  props: Record<string, unknown>;
  attrs: Record<string, unknown>;
  slots: Record<string, unknown>;
  refs: Record<string, unknown>;
  setupState: Record<string, unknown>;
  data: Record<string, unknown>;
  ctx: Record<string, unknown>;
  emit: (event: string, ...args: unknown[]) => void;
  isMounted: boolean;
  isUnmounted: boolean;
  isDeactivated: boolean;
  isKeepingAlive: boolean;
  bum?: (() => void) | null;
  effects?: Array<{ stop: () => void }>;
  update?: () => void;
}

export interface BaseComponentOptions {
  props?: Record<string, unknown>;
  emits?: string[] | Record<string, unknown>;
  setup?: (...args: any[]) => any;
  render?: (...args: any[]) => any;
  computed?: Record<string, () => unknown>;
  methods?: Record<string, (...args: any[]) => any>;
  watch?: Record<string, unknown>;
  data?: () => Record<string, unknown>;
}

// ============================================================
// VNode 工具函数
// ============================================================

/**
 * 检查是否为 Fragment VNode
 */
export function isVNode(value: unknown): value is VNode {
  return (
    value !== null &&
    typeof value === "object" &&
    (value as any).__v_isVNode === true
  );
}

/**
 * 检查 VNode 是否为 Fragment 类型
 */
export function isFragment(vnode: VNode): boolean {
  return vnode.type === Fragment;
}

/**
 * 检查 VNode 是否为 Text 类型
 */
export function isTextVNode(vnode: VNode): boolean {
  return vnode.type === Text;
}

/**
 * 检查 VNode 是否为 Comment 类型
 */
export function isCommentVNode(vnode: VNode): boolean {
  return vnode.type === Comment;
}

/**
 * 检查两个 VNode 是否类型相同
 */
export function isSameVNodeType(n1: VNode, n2: VNode): boolean {
  return n1.type === n2.type && n1.key === n2.key;
}

/**
 * 检查 VNode 是否包含指定的 patch flag
 */
export function hasPatchFlag(vnode: VNode, flag: number): boolean {
  const pf = vnode.patchFlag;
  if (pf === -1 /* HOISTED */ || pf === -2 /* BAIL */) return true;
  return (pf & flag) !== 0;
}

/**
 * 描述 patch flag 的含义
 */
export function describePatchFlag(flag: number): string {
  const names: string[] = [];

  if (flag === PatchFlags.HOISTED) return "HOISTED";
  if (flag === PatchFlags.BAIL) return "BAIL";

  if (flag & PatchFlags.TEXT) names.push("TEXT");
  if (flag & PatchFlags.CLASS) names.push("CLASS");
  if (flag & PatchFlags.STYLE) names.push("STYLE");
  if (flag & PatchFlags.PROPS) names.push("PROPS");
  if (flag & PatchFlags.FULL_PROPS) names.push("FULL_PROPS");
  if (flag & PatchFlags.HYDRATE_EVENTS) names.push("HYDRATE_EVENTS");
  if (flag & PatchFlags.STABLE_FRAGMENT) names.push("STABLE_FRAGMENT");
  if (flag & PatchFlags.KEYED_FRAGMENT) names.push("KEYED_FRAGMENT");
  if (flag & PatchFlags.UNKEYED_FRAGMENT) names.push("UNKEYED_FRAGMENT");
  if (flag & PatchFlags.NEED_PATCH) names.push("NEED_PATCH");
  if (flag & PatchFlags.DYNAMIC_SLOTS) names.push("DYNAMIC_SLOTS");

  return names.join(" | ") || "NO_FLAGS";
}
