/**
 * @lytjs/vdom - types
 * VDOM 特定类型，扩展 common-vnode 类型
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import type { Props as SharedProps } from '@lytjs/shared-types';

// 为方便起见从 @lytjs/host-contract 重新导出
export type {
  RendererHost,
  HostRect,
  HostStyleDeclaration,
  TransitionDurationInfo,
  HostEvent,
  HostEventHandler,
  HostEventOptions,
} from '@lytjs/host-contract';

// ============================================================
// 基础类型
// ============================================================

/** VNode 的 Props 类型 */
export type Props = SharedProps;

/** 宿主元素类型（DOM Element） */
export type HostElement = Element;

/** 宿主节点类型（DOM Node） */
export type HostNode = Node;

// ============================================================
// 组件类型
// ============================================================

/** 带有内部标记的组件接口 */
export interface Component<P = Record<string, unknown>, RawBindings = {}> {
  __v_isComponent: true;
  name?: string;
  setup?: (
    props: P,
    ctx: {
      attrs: Record<string, unknown>;
      slots: Record<string, unknown>;
      emit: (...args: unknown[]) => void;
    },
  ) => RawBindings | void;
  render?: (ctx: { props: P; slots: Record<string, unknown>; [key: string]: unknown }) => unknown;
  props?: Record<string, unknown>;
  emits?: string[] | Record<string, unknown>;
}

// ============================================================
// 渲染器类型
// ============================================================

/**
 * 宿主平台操作的渲染器选项。
 *
 * @deprecated 请使用 @lytjs/host-contract 中的 RendererHost。
 * 此接口保留仅为向后兼容。
 */
export interface RendererOptions<HN = unknown, HE extends HN = HN> {
  /** 从标签字符串创建宿主元素 */
  createElement(type: string): HE;
  /** 设置宿主元素的文本内容 */
  setElementText(node: HE, text: string): void;
  /** 在锚点前插入宿主节点，或追加到父节点 */
  insert(child: HN, parent: HN, anchor?: HN | null): void;
  /** 从父节点移除宿主节点 */
  remove(child: HN): void;
  /** 创建文本节点 */
  createText(text: string): HN;
  /** 设置文本节点的文本内容 */
  setText(node: HN, text: string): void;
  /** 获取宿主节点的下一个兄弟节点 */
  nextSibling(node: HN): HN | null;
  /** 获取宿主节点的父节点 */
  parentNode(node: HN): HN | null;
  /** 在宿主元素上 patch 一个 prop */
  patchProp(
    el: HE,
    key: string,
    prevValue: unknown,
    nextValue: unknown,
    prevChildren?: VNode[],
    parentComponent?: ComponentInternalInstance | null,
    parentSuspense?: SuspenseBoundary | null,
  ): void;
  /** 创建注释节点 */
  createComment(text: string): HN;
  /** 查询选择器（用于 Teleport 目标） */
  querySelector?(selector: string): HE | null;
  /**
   * 取节点类型（对齐 DOM `nodeType`：1=元素 / 3=文本 / 8=注释）。
   *
   * ⚠️ **仅水合路径需要**：挂载时用它判断容器里**既有的**节点是否与 vnode 同类，
   * 从而决定「认领复用」还是「新建」。`@lytjs/host-contract` 的 `RendererHost`
   * 早已声明同名可选方法（注释即写明「用于 hydration」），`WebRendererHost` 也已实现，
   * 但此前**从未接进渲染器** ⇒ `createRenderer(...).hydrate()` 无法判断节点类型。
   */
  getNodeType?(node: HN): number;
  /**
   * 取元素标签名（**小写**），用于水合时匹配同标签的既有元素。
   * 同上：宿主契约已声明，渲染器此前未接。
   */
  getTagName?(el: HE): string;
  /**
   * 取子节点列表（宿主契约里 `WebRendererHost` 已有 `getChildNodes`）。
   *
   * ⚠️ 宿主只提供 `nextSibling(node)`（**没有 firstChild**），因此水合认领
   * 必须靠它列出子节点后按序扫描。同样是「契约与宿主都实现了、渲染器此前未接」。
   */
  getChildNodes?(node: HN): HN[];
  /** 可选回调：为子组件创建和 setup 组件实例。
   *  当提供时，mountComponent 会在 vnode.component 未设置时调用此回调。
   *  接收 vnode 和父组件实例。
   *  应使用创建的实例设置 vnode.component。 */
  setupChildComponent?(vnode: VNode, parentComponent: ComponentInternalInstance | null): void;
  /** FIX: P1-4 可选回调：在组件更新时规范化 props。
   *  当提供时，patch 会在将 nextProps 赋值给 component.props 之前调用此回调，
   *  以确保声明的 props 验证和 attrs 分离。 */
  normalizeProps?(
    instance: ComponentInternalInstance,
    rawProps: Record<string, unknown> | null,
  ): void;
  /**
   * 可选回调：组件**首次挂载完成**后调用（对应 `onMounted` / `mounted`）。
   *
   * ⚠️ 2026-09-26 新增。此前 vdom **从不调用** `callMountedHook` ——
   * 该函数的调用点仅存在于 component 的导出/文档/测试里，
   * 于是 `onMounted` / `onUpdated` / `onBeforeUnmount` 在生产 VNode 路径**永不执行**
   * （依赖它们的代码静默失效，例如 error-boundary 的异步错误监听器永不安装）。
   *
   * vdom 不能直接 import `@lytjs/component`（会形成循环依赖），
   * 因此沿用本接口既有的「回调注入」模式，由 `@lytjs/core` 注入实现。
   */
  invokeMountedHook?(instance: ComponentInternalInstance): void;
  /** 可选回调：组件**更新完成**后调用（对应 `onUpdated` / `updated`） */
  invokeUpdatedHook?(instance: ComponentInternalInstance): void;
  /** 可选回调：组件**卸载前**调用（对应 `onBeforeUnmount` / `beforeUnmount`） */
  invokeBeforeUnmountHook?(instance: ComponentInternalInstance): void;
  /** 可选回调：组件**卸载完成**后调用（对应 `onUnmounted` / `unmounted`） */
  invokeUnmountedHook?(instance: ComponentInternalInstance): void;
}

// ============================================================
// Suspense 类型
// ============================================================

/**
 * Suspense boundary 接口
 *
 * 用于 patch 算法管理异步组件渲染。
 * boundary 跟踪 active 和 pending 分支、fallback 状态
 * 以及关联的响应式 effect。
 *
 * 注意：container 和 anchor 使用 `unknown` 以保持平台无关。
 * 渲染器内部知道具体的宿主节点类型。
 */
export interface SuspenseBoundary {
  vnode: VNode;
  parent: ComponentInternalInstance | null;
  parentComponent: ComponentInternalInstance | null;
  isSVG: boolean;
  container: unknown;
  anchor: unknown;
  activeBranch: VNode | null;
  pendingBranch: VNode | null;
  isInFallback: boolean;
  isHydrating: boolean;
  effects: Array<{ stop: () => void }>;
}

// ============================================================
// 组件内部实例类型
// ============================================================

/**
 * 组件内部实例 - 存储组件的运行时状态。
 * 由 setupChildComponent 回调创建。
 */
export interface InternalComponentInstance {
  /** VNode */
  vnode: VNode;
  /** 父组件实例 */
  parent: InternalComponentInstance | null;
  /** 子树 */
  subTree: VNode;
  /** 是否已挂载 */
  isMounted: boolean;
  /** 是否已卸载 */
  isUnmounted: boolean;
  /** 更新函数 */
  update: (() => void) | null;
  /** 渲染函数 */
  render: (() => VNode) | null;
}
