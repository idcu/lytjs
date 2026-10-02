// @lytjs/shared-types - 渲染器相关类型

import type { ComponentPublicInstance } from './component';

/** 渲染器接口（跨包抽象） */
// 使用泛型 VNode 类型，避免对具体 VNode 实现的依赖
export interface Renderer<VNode = unknown> {
  mount(vnode: VNode | null, container: Element): void;
  unmount(vnode: VNode | null): void;
  patch(oldVNode: VNode | null, newVNode: VNode | null, container: Element): void;
  move(vnode: VNode, container: Element, anchor: Element | null): void;
  /**
   * 水合挂载（**可选**能力）：复用容器内既有的 SSR DOM，并照常建立组件实例与
   * 响应式 effect ⇒ 挂载后由客户端接管更新。
   *
   * 声明为可选，是为了不破坏其它 `Renderer` 实现（测试替身等）；
   * 缺省时 `core` 的 `mount(el, { hydrate: true })` 会退化为普通 `mount`。
   */
  hydrate?(vnode: VNode, container: Element): void;
}

/** 指令钩子接口 */
export interface Directive<T = Element, VNode = unknown> {
  created?: (
    el: T,
    binding: DirectiveBinding<VNode>,
    vnode: VNode,
    prevVNode: VNode | null,
  ) => void;
  beforeMount?: (
    el: T,
    binding: DirectiveBinding<VNode>,
    vnode: VNode,
    prevVNode: VNode | null,
  ) => void;
  mounted?: (
    el: T,
    binding: DirectiveBinding<VNode>,
    vnode: VNode,
    prevVNode: VNode | null,
  ) => void;
  beforeUpdate?: (
    el: T,
    binding: DirectiveBinding<VNode>,
    vnode: VNode,
    prevVNode: VNode | null,
  ) => void;
  updated?: (
    el: T,
    binding: DirectiveBinding<VNode>,
    vnode: VNode,
    prevVNode: VNode | null,
  ) => void;
  beforeUnmount?: (
    el: T,
    binding: DirectiveBinding<VNode>,
    vnode: VNode,
    prevVNode: VNode | null,
  ) => void;
  unmounted?: (
    el: T,
    binding: DirectiveBinding<VNode>,
    vnode: VNode,
    prevVNode: VNode | null,
  ) => void;
}

/** 指令绑定信息 */
export interface DirectiveBinding<VNode = unknown> {
  instance: ComponentPublicInstance | null;
  value: unknown;
  oldValue: unknown;
  arg?: string;
  modifiers: Record<string, boolean>;
  dir: Directive<Element, VNode>;
}

/** 指令参数数组类型 */
export type DirectiveArguments = [Directive, unknown, string?, Record<string, boolean>?][];
