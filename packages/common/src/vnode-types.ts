/**
 * Lyt.js 统一 VNode 类型定义
 *
 * 此文件提供跨包共享的 VNode 相关类型，
 * 避免在多个包中重复定义不一致的 VNode 接口。
 */

// ================================================================
//  ShapeFlags - VNode 类型标志
// ================================================================

/** VNode 类型标志位 */
export const enum ShapeFlags {
  /** 元素节点 */
  ELEMENT = 1,
  /** 函数式组件 */
  FUNCTIONAL_COMPONENT = 1 << 1,
  /** 有状态组件 */
  STATEFUL_COMPONENT = 1 << 2,
  /** 文本子节点 */
  TEXT_CHILDREN = 1 << 3,
  /** 数组子节点 */
  ARRAY_CHILDREN = 1 << 4,
  /** 插槽子节点 */
  SLOTS_CHILDREN = 1 << 5,
  /** 动态属性 */
  PROPS = 1 << 6,
  /** 需要注水（SSR） */
  NEED_HYDRATION = 1 << 7,
  /** 组件应保持活跃（KeepAlive） */
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
  /** 组件已保持活跃 */
  COMPONENT_KEPT_ALIVE = 1 << 9,
}

// ================================================================
//  PatchFlags - 更新标志
// ================================================================

/** Patch 标志位，用于精确更新 */
export const enum PatchFlags {
  /** 动态文本 */
  TEXT = 1,
  /** 动态 class */
  CLASS = 1 << 1,
  /** 动态 style */
  STYLE = 1 << 2,
  /** 动态属性（排除 class 和 style） */
  PROPS = 1 << 3,
  /** 有动态的 key 属性（用于 full props diff） */
  FULL_PROPS = 1 << 4,
  /** 有事件监听器 */
  EVENT = 1 << 5,
  /** 内容有 ref */
  REF = 1 << 6,
  /** 作用域 ID */
  SCOPE_ID = 1 << 7,
  /** 需要注水 */
  NEED_HYDRATION = 1 << 8,
  /** 稳定的片段（子节点顺序不会改变） */
  STABLE_FRAGMENT = 1 << 9,
  /** 有 key 的子节点（diff 时使用 key） */
  KEYED_FRAGMENT = 1 << 10,
  /** 无 key 的子节点 */
  UNKEYED_FRAGMENT = 1 << 11,
  /** 动态的 ref 或 ref 绑定 */
  DYNAMIC_SLOTS = 1 << 12,
  /** 仅编译器需要的标志（运行时使用） */
  HOISTED = -1,
  /** 编译时提示：diff 时应使用优化的块树算法 */
  BAIL = -2,
}

// ================================================================
//  VNode 接口
// ================================================================

/** 源代码位置信息 */
export interface VNodeSourceLocation {
  /** 起始行号 */
  start: { line: number; column: number }
  /** 结束行号 */
  end: { line: number; column: number }
  /** 源代码内容 */
  source?: string
}

/** VNode 数据 */
export interface VNodeData {
  /** 静态属性 */
  props?: Record<string, unknown>
  /** DOM 属性 */
  attrs?: Record<string, unknown>
  /** 事件处理器 */
  on?: Record<string, Function>
  /** 样式 */
  style?: Record<string, string> | string
  /** class */
  class?: string | Record<string, boolean> | Array<string | Record<string, boolean>>
  /** key */
  key?: string | number
  /** ref */
  ref?: string | ((el: unknown) => void)
  /** ref 用于组件 */
  refFor?: boolean
  /** 插槽 */
  slot?: string
  /** 作用域 ID */
  scopeId?: string
  /** 源代码位置 */
  loc?: VNodeSourceLocation
}

/** VNode - 虚拟 DOM 节点 */
export interface VNode {
  /** VNode 类型标志 */
  type: string | symbol | (() => unknown)
  /** 标签名或组件 */
  tag?: string
  /** VNode 数据 */
  data?: VNodeData
  /** 子节点 */
  children?: VNode[] | string | null
  /** 文本内容 */
  text?: string
  /** 元素 */
  el?: unknown
  /** 锚点（Fragment） */
  anchor?: unknown
  /** 类型标志 */
  shapeFlag?: number
  /** Patch 标志 */
  patchFlag?: number
  /** 动态属性名列表 */
  dynamicProps?: string[]
  /** 动态子节点 */
  dynamicChildren?: VNode[]
  /** 应用上下文 */
  appContext?: unknown
  /** 组件实例 */
  component?: unknown
  /** Suspense */
  suspense?: unknown
  /** 父 VNode */
  parent?: VNode | null
  /** key */
  key?: string | number | null
  /** ref */
  ref?: unknown
  /** 作用域 ID */
  scopeIds?: string[] | null
  /** 是否为静态提升节点 */
  isStatic?: boolean
  /** 静态提升索引 */
  staticIndex?: number
}

// ================================================================
//  ComponentOptions 接口
// ================================================================

/** 组件选项基础接口 */
export interface BaseComponentOptions {
  /** 组件名称 */
  name?: string
  /** 是否为纯展示组件（优化提示） */
  inheritAttrs?: boolean
}

/** 组件公共接口 */
export interface ComponentPublicInstance {
  /** 组件名称 */
  $name?: string
  /** 根元素 */
  $el?: unknown
  /** 父组件实例 */
  $parent?: ComponentPublicInstance | null
  /** 根组件实例 */
  $root?: ComponentPublicInstance
  /** Props */
  $props?: Record<string, unknown>
  /** 事件发射器 */
  $emit?: (event: string, ...args: unknown[]) => void
  /** 强制更新 */
  $forceUpdate?: () => void
  /** 下一个 tick */
  $nextTick?: (fn?: () => void) => Promise<void>
}

/** 组件内部实例 */
export interface ComponentInternalInstance {
  /** 组件类型 */
  type: unknown
  /** 组件选项 */
  propsOptions?: Record<string, unknown>
  /** 当前 props */
  props: Record<string, unknown>
  /** setup 返回的上下文 */
  setupState: Record<string, unknown>
  /** 组件代理 */
  proxy: ComponentPublicInstance | null
  /** 组件子树根 VNode */
  subTree: VNode | null
  /** 是否已挂载 */
  isMounted: boolean
  /** 是否已卸载 */
  isUnmounted: boolean
  /** 父实例 */
  parent: ComponentInternalInstance | null
  /** 根实例 */
  root: ComponentInternalInstance
  /** 作用域 ID */
  scopeId?: string
  /** 更新函数 */
  update?: () => void
  /** 卸载函数 */
  unmount?: () => void
  /** emit 函数 */
  emit?: (event: string, ...args: unknown[]) => void
  /** 生命周期钩子 */
  [key: `on${string}`]: Function | undefined
}
