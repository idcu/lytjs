// @lytjs/shared-types - 组件公共类型

/**
 * 插槽函数类型
 * @template Props - 插槽 props 类型
 */
export type SlotFunction<Props = Record<string, unknown>> = (
  props?: Props,
) => unknown[];

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
 * 组件内部实例类型别名（最小接口）
 * 用于跨包类型引用，避免循环依赖
 */
export type ComponentInternalInstance = unknown;

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
  errorCaptured?: (
    err: Error,
    instance: ComponentPublicInstance,
    info: string,
  ) => boolean | void;
  renderTracked?: (...args: unknown[]) => void;
  renderTriggered?: (...args: unknown[]) => void;
}
