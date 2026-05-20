// @lytjs/shared-types - 组件公共类型

/**
 * 插槽函数类型
 * @template Props - 插槽 props 类型
 */
export type SlotFunction<Props = Record<string, unknown>> = (props?: Props) => unknown[];

/**
 * 内部插槽映射类型
 * @template SlotProps - 插槽 props 类型映射
 */
export type InternalSlots<SlotProps = Record<string, unknown>> = Record<
  string,
  SlotFunction<SlotProps> | undefined
>;

/**
 * 组件公共实例接口
 * @template Props - 组件 props 类型
 * @template Data - 组件 data 类型
 */
export interface ComponentPublicInstance<
  Props = Record<string, unknown>,
  Data = Record<string, unknown>,
> {
  /** 组件 data 对象 */
  $data: Data;
  /** 组件 props 对象 */
  $props: Props;
  /** 组件根 DOM 元素 */
  $el: Element | null;
  /** 组件选项对象 */
  $options: Record<string, unknown>;
  /** 模板引用映射 */
  $refs: Record<string, Element | ComponentPublicInstance | null>;
  /** 插槽对象 */
  $slots: InternalSlots;
  /** 事件触发函数 */
  $emit: (event: string, ...args: unknown[]) => void;
  /** 强制更新函数 */
  $forceUpdate: () => void;
  /** nextTick 函数 */
  $nextTick: () => Promise<void>;
  /** 父组件实例 */
  $parent?: ComponentPublicInstance | null;
  /** 根组件实例 */
  $root?: ComponentPublicInstance | null;
  /** 属性对象 */
  $attrs?: Record<string, unknown>;
  /** provide 对象 */
  $provides?: Record<string | symbol, unknown>;
}

/**
 * 组件内部实例接口（最小接口）
 * 用于跨包类型引用，避免循环依赖
 */
export interface ComponentInternalInstance {
  uid: number;
  props: Record<string, unknown>;
  attrs: Record<string, unknown>;
  slots: InternalSlots;
  refs: Record<string, unknown>;
  vnode: { el: unknown };
  type: Record<string, unknown>;
  ctx: Record<string, unknown>;
  setupState: Record<string, unknown>;
  emit: (event: string, ...args: unknown[]) => void;
  isDeactivated?: boolean;
  effects?: { stop: () => void }[];
  activatedHooks?: (() => void)[];
  deactivatedHooks?: (() => void)[];
  appContext?: unknown;
  provides: Record<string | symbol, unknown>;
  parent: ComponentInternalInstance | null;
  root: ComponentInternalInstance;
  // FIX: P1-10 添加 bum 字段定义，用于 unmount 时访问 beforeUnmount 回调数组
  /** beforeUnmount 回调数组 */
  bum?: Array<() => void> | (() => void) | null;
  /** 是否已挂载 */
  isMounted?: boolean;
  /** 是否已卸载 */
  isUnmounted?: boolean;
  /** 组件子树 VNode */
  subTree?: { el: unknown } | null;
  /** 组件更新函数 */
  update?: () => void;
  /** renderTracked 钩子数组 */
  renderTrackedHooks?: Array<(...args: unknown[]) => void>;
  /** renderTriggered 钩子数组 */
  renderTriggeredHooks?: Array<(...args: unknown[]) => void>;
  /** 暴露的公共 API */
  exposed?: Record<string, unknown> | null;
  /** 是否保持活跃（keep-alive） */
  isKeepingAlive?: boolean;
  /** 属性访问缓存 */
  accessCache?: Record<string, number> | null;
  /** data 对象 */
  data?: Record<string, unknown>;
  /** 生命周期钩子集合 */
  lifecycle?: {
    beforeMount: Set<(...args: unknown[]) => void>;
    mounted: Set<(...args: unknown[]) => void>;
    beforeUpdate: Set<(...args: unknown[]) => void>;
    updated: Set<(...args: unknown[]) => void>;
    beforeUnmount: Set<(...args: unknown[]) => void>;
    unmounted: Set<(...args: unknown[]) => void>;
  };
}

/**
 * 组件选项基础接口
 */
export interface ComponentOptionsBase {
  name?: string;
  props?: Record<string, unknown>;
  data?: () => Record<string, unknown>;
  computed?: Record<string, unknown>;
  methods?: Record<string, (...args: unknown[]) => unknown>;
  watch?: Record<string, unknown>;
  render?: (...args: unknown[]) => unknown;
  setup?: (...args: unknown[]) => unknown;
  emits?: string[] | Record<string, unknown>;
  components?: Record<string, unknown>;
  directives?: Record<string, unknown>;
  beforeCreate?: () => void;
  created?: () => void;
  beforeMount?: () => void;
  mounted?: () => void;
  beforeUpdate?: () => void;
  updated?: () => void;
  beforeUnmount?: () => void;
  unmounted?: () => void;
  errorCaptured?: (err: Error, instance: ComponentPublicInstance, info: string) => boolean | void;
  renderTracked?: (...args: unknown[]) => void;
  renderTriggered?: (...args: unknown[]) => void;
}
