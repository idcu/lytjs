// packages/renderer/src/vapor/mount-component.ts
// Signal/Vapor 模式的组件挂载运行时
//
// 背景：Signal/Vapor 模式的 codegen 此前**完全没有组件概念** —— 组件标签会被
// 当成普通 HTML 元素写进 createTemplate 的模板串里，产物出现字面量 `<Child />`，
// DOM 里也被插入一个无意义的自定义标签，组件的 setup/render 根本不会执行。
//
// 本模块提供运行时入口 `mountComponent()`，配合 codegen 生成的调用
// `mountComponent(_c.Child, props, container)` 完成真实挂载。
//
// 实现策略：
// - 复用 vdom + adapter-web 的 DOM 渲染器（它能正确处理组件 vnode 的 setup/渲染/更新）
// - 用 effect 建立响应式边界（预热插槽依赖）；**首次 `mount`、后续 `patch`**，
//   复用同一组件实例与 DOM（2026-10-10 由「每次清空重挂载」改为 patch 复用，
//   见 `mountComponent` 内 P0-3 注释）
// - 组件实例由 @lytjs/component 的 createComponentInstance / setupComponent 建立，
//   通过渲染器的 setupChildComponent / normalizeProps 回调接入

import { createVNode, Fragment } from '@lytjs/vdom';
import type { VNode } from '@lytjs/vdom';
import { createDOMRenderer } from '@lytjs/adapter-web';
import { createComponentInstance, setupComponent, initProps } from '@lytjs/component';
import { effect } from '@lytjs/reactivity';
import { getRealNode } from '@lytjs/dom-runtime';

/** 组件定义：函数组件、选项对象或异步组件包装 */
export type VaporComponentLike = unknown;

/** 渲染器单例（懒创建，避免模块加载期就依赖 DOM） */
let renderer: ReturnType<typeof createDOMRenderer> | null = null;

function getRenderer(): ReturnType<typeof createDOMRenderer> {
  if (renderer) return renderer;

  renderer = createDOMRenderer({
    setupChildComponent(childVNode: unknown, parentComponent: unknown): void {
      const vnode = childVNode as VNode;
      const instance = createComponentInstance(
        vnode as never,
        (parentComponent ?? null) as never,
      ) as unknown as Record<string, unknown>;

      setupComponent(instance as never);

      (vnode as unknown as { component: unknown }).component = instance;
    },
    normalizeProps(instance: unknown, rawProps: unknown): void {
      initProps(instance as never, (rawProps ?? null) as Record<string, unknown> | null);
    },
  });

  return renderer;
}

/**
 * 在当前响应式上下文中预求值一次插槽，用于建立依赖
 *
 * 插槽可能是「单个函数（默认插槽）」或「函数对象（具名插槽集合）」。
 */
function warmupSlots(slots: unknown): void {
  if (typeof slots === 'function') {
    try {
      (slots as () => unknown)();
    } catch {
      // 预热失败不应影响挂载（真正的求值发生在组件渲染里，那里会正常报错）
    }
    return;
  }
  if (slots && typeof slots === 'object') {
    for (const key of Object.keys(slots as Record<string, unknown>)) {
      const fn = (slots as Record<string, unknown>)[key];
      if (typeof fn !== 'function') continue;
      try {
        (fn as () => unknown)();
      } catch {
        // 同上
      }
    }
  }
}

/**
 * 在 Signal/Vapor 模式下挂载组件
 *
 * @param comp      组件定义（函数组件 / 选项对象 / 异步组件包装）
 * @param props     传给组件的 props（可为空）
 * @param container 挂载容器（codegen 会传组件占位元素的变量）
 * @param slots     插槽（codegen 生成 `{default:()=>[vnode,...]}`），可为空
 */
export function mountComponent(
  comp: VaporComponentLike,
  props: Record<string, unknown> | null | undefined,
  container: unknown,
  slots?: unknown,
): void {
  if (container === null || container === undefined) return;
  if (comp === null || comp === undefined) return;

  const host = container as Node;

  // 占位元素（codegen 生成的 `<lyt-comp>`）本身**不应参与布局**：
  // 它是自定义标签，浏览器按未知元素处理（默认 `display: inline`），
  // 会让内部的块级子元素布局异常。设为 `display: contents` 后该元素不生成盒子，
  // 其子元素直接参与父级布局 —— 效果上等同于"内容直接取代了标签"。
  //
  // 为什么不直接**移除**占位元素：DOM 渲染器的 `mount(vnode, container)` 只接受
  // container（没有 anchor 参数），移除后重渲染就没有落点了。要真正移除需要给
  // 核心 `mount` 增加锚点能力，属更大的改动，收益（DOM 更干净）与风险不成正比。
  if (typeof (host as Element).setAttribute === 'function') {
    (host as Element).setAttribute('style', 'display: contents');
  }

  // ⚠️ 2026-10-10（P0-3 修复）：此前本 effect 每次重跑都是「清空容器 + 重新 `mount`」，
  // 等于**整体重挂载**：组件实例被销毁重建（`setup` 重跑、`onMounted`/`onUnmounted`
  // 每次更新都触发、watcher 重订阅），DOM 也整棵重建（丢焦点 / 输入值 / 滚动位置）。
  //
  // 现在改为「首次 `mount`，之后只调用组件实例自己的 `update()`」：实例、DOM、
  // 响应式订阅全部复用，仅对子树做一次 diff —— 语义仍是「重渲染该组件子树」，
  // 但不再销毁重建。
  //
  // 为什么不是 `patch(prevVNode, nextVNode)`：本 effect 每次传的 props/slots 是
  // **同一个引用**，而 patch 的组件分支以 `propsChanged || slotsChanged` 决定是否
  // 调用 `update()` ⇒ 恒为假、不会更新。也不能依赖组件自身的渲染 effect ——
  // 它是 `watchEffect`（`flush:'pre'`）的**异步**队列，无法保证本 effect 重跑后
  // 同步可见（既有用例就是同步断言的）。
  let instance: { update?: () => void } | null = null;

  effect(() => {
    // 插槽「预热」：插槽函数的**真正执行**发生在组件渲染内部（另一层响应式边界），
    // 若只在那里求值，插槽内引用的父级响应式数据不会被本 effect 收集为依赖 ⇒
    // 父级数据变化时不会触发重渲染。故先在本 effect 上下文里求值一次（结果为 vnode，
    // 仅用于建立依赖，随即可丢弃）。
    warmupSlots(slots);

    if (instance !== null) {
      // 依赖变化：复用同一实例与 DOM，同步重渲染子树
      instance.update?.();
      return;
    }

    // 首次挂载。第三个参数是 children（即「插槽」）：setupComponent 内部会把它交给
    // initSlots 归一化 —— 支持「函数 = 默认插槽」与「对象 = 具名插槽集合」两种形态。
    // 容器里可能已有 codegen 留下的占位内容，先清空。
    const vnode = createVNode(comp as never, (props ?? null) as never, (slots ?? null) as never);
    clearHost(host);
    getRenderer().mount(vnode, host);
    instance = (vnode as unknown as { component?: { update?: () => void } }).component ?? null;
  });
}

/** 便于测试：重置渲染器单例 */
export function resetVaporComponentRenderer(): void {
  renderer = null;
}

/**
 * 解析插槽函数返回的 vnode。
 *
 * 插槽函数可能返回「单个 vnode」「vnode 数组」「null/undefined」，
 * 统一归一化为数组（空则返回 `[]`）。
 */
function resolveSlotVNodes(slotFn: unknown, props: unknown): unknown[] {
  if (typeof slotFn !== 'function') return [];
  const result = (slotFn as (p?: unknown) => unknown)(props);
  if (result === null || result === undefined) return [];
  return Array.isArray(result) ? result : [result];
}

/** 清空宿主元素（**仅用于首次挂载**；更新走 `patch` / 实例 `update()`，不再清空重建） */
function clearHost(host: Node): void {
  const maybeElement = host as unknown as { textContent?: unknown };
  if (typeof maybeElement.textContent === 'string') {
    (maybeElement as { textContent: string }).textContent = '';
  } else {
    while (host.firstChild) host.removeChild(host.firstChild);
  }
}

/**
 * 把**插槽内容**挂载进容器 —— signal/Vapor 模式下 `<slot/>` 出口的运行期能力。
 *
 * 背景（2026-09-30）：`<slot/>` 此前在 signal 模式**完全不工作** —— transform 没把它转成
 * `renderSlot(...)`，codegen 也没有对应分支，产物里是字面量 `<slot>` 元素。
 * 这是缺口三段中的**第 3 段**：运行期缺「把插槽 vnode 挂载进 DOM 元素」的能力。
 * 本函数复用 `mountComponent` 同一套 DOM 渲染器（`getRenderer()`），
 * 因此组件 vnode / Fragment / 文本节点都能正确处理。
 *
 * @param slotFn    插槽函数（`_c.$slots.default` / `_c.$slots[name]`），可为空
 * @param container 挂载容器（codegen 传插槽出口所在元素）
 * @param props     作用域插槽的 props（可选）
 */
export function mountVNode(vnode: unknown, container: unknown): void {
  if (container === null || container === undefined) return;
  if (vnode === null || vnode === undefined) return;

  // codegen 传进来的是 `createTemplate()` 的**包装对象**（TemplateWrapper），
  // 而 vdom 的某些 patch（如 Teleport 需要搬移节点）只认真实 DOM 节点 ⇒ 先解析。
  const host = getRealNode(container) as Node;
  clearHost(host);
  getRenderer().mount(vnode as never, host);
}

export function mountSlot(slotFn: unknown, container: unknown, props?: unknown): void {
  if (container === null || container === undefined) return;

  // 同 `mountComponent`（P0-3）：保留上一次 vnode，依赖变化时走 `patch` 复用实例与 DOM，
  // 而不是「清空 + 重新挂载」—— 后者会让插槽内的子组件每次更新都被销毁重建。
  let prevVNode: VNode | null = null;

  effect(() => {
    // codegen 传进来的是 `createTemplate()` 的**包装对象**（TemplateWrapper）⇒ 先解析。
    const host = getRealNode(container) as Node;

    const vnodes = resolveSlotVNodes(slotFn, props);
    // 多个 vnode ⇒ 用 Fragment 承载（vdom 的 Fragment patch 已支持）
    const next: VNode | null =
      vnodes.length === 0
        ? null
        : ((vnodes.length === 1
            ? vnodes[0]
            : createVNode(Fragment as never, null, vnodes as never)) as VNode);

    if (next === null) {
      // 插槽内容清空：卸载旧节点（触发子组件 unmounted 并移除 DOM），再兜底清空容器
      if (prevVNode !== null) {
        getRenderer().unmount(prevVNode);
        prevVNode = null;
      }
      clearHost(host);
      return;
    }

    if (prevVNode === null) {
      clearHost(host);
      getRenderer().mount(next, host);
    } else if (prevVNode.type === next.type) {
      getRenderer().patch(prevVNode, next, host);
    } else {
      // 类型变化（如插槽内 v-if 翻转）：旧节点无法复用，退回「卸载 + 清空 + 挂载」
      getRenderer().unmount(prevVNode);
      clearHost(host);
      getRenderer().mount(next, host);
    }
    prevVNode = next;
  });
}
