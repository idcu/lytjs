// src/component-renderer.ts
// @lytjs/core-vnode - 组件感知的 DOM 渲染器装配
//
// vdom 不能反向依赖 `@lytjs/component`（会循环），因此「创建组件实例 / 执行 setup /
// 触发生命周期钩子」这几件事必须由本包**注入**给渲染器。
//
// ⚠️ 2026-10-21：此前这段装配**只**存在于 `create-app.ts`（内联对象），而
// `web-component.ts` 是**裸调** `createDOMRenderer()` ⇒ 没有 `setupChildComponent`：
//   - 根组件 vnode 的 `component` 字段为空 ⇒ `mountComponent` 只 warn 后 return
//     ⇒ **自定义元素渲染为空**（不是样式问题，是压根没挂上去）；
//   - 即使根节点挂上，**子组件**也会走同一条 warn 分支。
// 现在 `create-app.ts` 与 `web-component.ts` 都走本文件，从结构上消除「修一处漏一处」。

import { createDOMRenderer } from '@lytjs/renderer';
import type { VNode } from '@lytjs/vdom';
import {
  createComponentInstance,
  setupComponent,
  initProps,
  callMountedHook,
  callUpdatedHook,
  callBeforeUnmountHook,
  callUnmountedHook,
} from '@lytjs/component';
import type { AppContext, ComponentInternalInstance } from '@lytjs/component';

type RendererOptionsArg = NonNullable<Parameters<typeof createDOMRenderer>[0]>;

/**
 * 创建一个「能挂载组件 vnode」的 DOM 渲染器。
 *
 * @param resolveAppContext 无父组件时使用的 appContext（自定义元素各自持有自己的上下文）
 */
export function createComponentRenderer(
  resolveAppContext: () => AppContext,
): ReturnType<typeof createDOMRenderer> {
  // 说明：`@lytjs/component` 与 `@lytjs/vdom`（经 `@lytjs/common-vnode`）各自声明了一份
  // 同名的 `ComponentInternalInstance`，二者结构不等价。渲染器选项走的是 vdom 那份，
  // 因此这里先把选项对象按 vdom 契约断言传入，回调内部再转回 component 的类型使用。
  const rendererOptions = {
    setupChildComponent(childVNode: VNode, parentComponent: unknown) {
      const parent = parentComponent as ComponentInternalInstance | null;
      const childInstance = createComponentInstance(childVNode, parent);
      // 从父组件或根组件继承 appContext
      childInstance.appContext = parent ? parent.appContext : resolveAppContext();
      setupComponent(childInstance);
      // ★ 必须回填：`mountComponent` 靠 `vnode.component` 判断「实例已就绪」，
      //   为空则直接 warn + return（不渲染）。
      (childVNode as unknown as { component: ComponentInternalInstance }).component = childInstance;
    },
    // 组件更新时重新规范化 props（保留 `initProps` 的声明校验 / attrs 分离语义；
    // 缺省时 patch 会退化为 `component.props = nextProps` 直接赋值）
    normalizeProps(instance: unknown, rawProps: Record<string, unknown> | null) {
      initProps(instance as ComponentInternalInstance, rawProps);
    },
    // ── 组件生命周期钩子的实现注入（vdom 侧只做可选调用）────────────────────
    invokeMountedHook(instance: unknown) {
      callMountedHook(instance as ComponentInternalInstance);
    },
    invokeUpdatedHook(instance: unknown) {
      callUpdatedHook(instance as ComponentInternalInstance);
    },
    invokeBeforeUnmountHook(instance: unknown) {
      callBeforeUnmountHook(instance as ComponentInternalInstance);
    },
    invokeUnmountedHook(instance: unknown) {
      callUnmountedHook(instance as ComponentInternalInstance);
    },
  } as unknown as RendererOptionsArg;

  return createDOMRenderer(rendererOptions);
}
