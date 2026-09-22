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
// 实现策略（首版）：
// - 复用 vdom + adapter-web 的 DOM 渲染器（它能正确处理组件 vnode 的 setup/渲染/更新）
// - 用 effect 建立响应式边界，依赖变化时**整体重渲染**该组件子树
//   （细粒度更新留到后续版本；整体重渲染保证正确性优先）
// - 组件实例由 @lytjs/component 的 createComponentInstance / setupComponent 建立，
//   通过渲染器的 setupChildComponent / normalizeProps 回调接入

import { createVNode } from '@lytjs/vdom';
import type { VNode } from '@lytjs/vdom';
import { createDOMRenderer } from '@lytjs/adapter-web';
import { createComponentInstance, setupComponent, initProps } from '@lytjs/component';
import { effect } from '@lytjs/reactivity';

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

  // 首次渲染 + 依赖变化后的整体重渲染
  effect(() => {
    // 插槽「预热」：插槽函数的**真正执行**发生在组件渲染内部（另一层响应式边界），
    // 若只在那里求值，插槽内引用的父级响应式数据不会被本 effect 收集为依赖 ⇒
    // 父级数据变化时不会整体重渲染。故先在本 effect 上下文里求值一次（结果为 vnode，
    // 仅用于建立依赖，随即可丢弃）。
    warmupSlots(slots);

    // 第三个参数是 children（即「插槽」）：setupComponent 内部会把它交给 initSlots
    // 归一化 —— 支持「函数 = 默认插槽」与「对象 = 具名插槽集合」两种形态。
    const vnode = createVNode(comp as never, (props ?? null) as never, (slots ?? null) as never);

    // 清空占位容器（整体重渲染策略）
    const maybeElement = host as unknown as { textContent?: unknown };
    if (typeof maybeElement.textContent === 'string') {
      (maybeElement as { textContent: string }).textContent = '';
    } else {
      while (host.firstChild) host.removeChild(host.firstChild);
    }

    getRenderer().mount(vnode, host);
  });
}

/** 便于测试：重置渲染器单例 */
export function resetVaporComponentRenderer(): void {
  renderer = null;
}
