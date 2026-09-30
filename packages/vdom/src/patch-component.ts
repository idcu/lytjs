/**
 * @lytjs/vdom - patch-component
 *
 * Component vnode 的挂载逻辑。
 * 包含 mountComponent 函数，负责组件实例创建、渲染、inheritAttrs 处理等。
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { Fragment, ShapeFlags } from '@lytjs/common-vnode';
import { warn, error } from '@lytjs/common-error';
import { watchEffect } from '@lytjs/reactivity';
import type { SuspenseBoundary } from './types';
import type { RendererContext } from './patch-element';
import { createVNode } from './vnode';

// ============================================================
// 组件递归深度限制
// ============================================================

// FIX: P1-L4 组件递归深度无限制 - 添加递归深度限制（100层）
const MAX_RECURSION_DEPTH = 100;
const componentRecursionDepthMap = new WeakMap<ComponentInternalInstance, number>();

// ============================================================
// 组件 patch 工厂
// ============================================================

// FIX: P1-09 定义 ComponentInternalRuntimeProps 接口替代 as unknown as Record，
// 提供更精确的类型安全访问组件内部属性
interface ComponentInternalRuntimeProps {
  render?: (ctx: Record<string, unknown>) => VNode;
  name?: string;
  inheritAttrs?: boolean;
  errorCaptured?: (err: Error, instance: unknown, info: string) => boolean | void;
  [key: string]: unknown;
}

export interface ComponentPatchAPI<HN, _HE extends HN> {
  mountComponent: (
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
}

/**
 * 创建 component 相关的 patch 函数集合。
 */
export function createComponentPatch<HN, HE extends HN>(
  ctx: RendererContext<HN, HE>,
): ComponentPatchAPI<HN, HE> {
  const { setupChildComponent, patch } = ctx;

  // ============================================================
  // mountComponent
  // ============================================================

  function mountComponent(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    let component = vnode.component as ComponentInternalInstance | null | undefined;

    // ============================================================
    // KeepAlive 激活分支
    // ============================================================
    // 当子 vnode 携带 `COMPONENT_KEPT_ALIVE`（由 KeepAlive 的 render 在缓存命中时
    // 打上）时，组件实例已存在且其 DOM 保存在隐藏仓库里 —— 不应重新 mount，
    // 而应调用 KeepAlive 暴露的 `activate` 把既有 DOM 移回容器、触发 activated 钩子。
    //
    // ⚠️ 2026-09-27 补齐：此前 vdom **从不消费**这个 flag，KeepAlive 退化为
    // pass-through（切回时重新 mount、状态丢失）。访问路径：`vnode.component.parent`
    // 必为 KeepAlive 实例（KeepAlive 在 render 中把子 vnode 作为自己的 subTree，
    // patch 时以自身为 parentComponent 创建子实例），其 `setupState` 暴露了
    // `activate` / `deactivate`（见 keep-alive.ts）。
    if (vnode.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE && component) {
      const ka = (component.parent?.setupState ?? {}) as Record<string, unknown>;
      const activate = ka.activate as ((v: VNode, c: unknown, a: unknown) => void) | undefined;
      activate?.(vnode, container, anchor);
      return;
    }

    if (!component) {
      // 尝试使用提供的回调创建和 setup 组件实例
      if (setupChildComponent) {
        setupChildComponent(vnode, parentComponent);
        component = vnode.component as ComponentInternalInstance | null | undefined;
      }
      if (!component) {
        warn(
          `mountComponent received a component vnode without a component instance. ` +
            `Ensure setupComponent has been called before mounting.`,
        );
        return;
      }
    }

    // FIX: P1-L4 组件递归深度无限制 - 检查递归深度
    const currentDepth = componentRecursionDepthMap.get(component) ?? 0;
    if (currentDepth > MAX_RECURSION_DEPTH) {
      throw new Error(
        `Component recursion depth exceeded (${MAX_RECURSION_DEPTH}). ` +
          `Possible infinite recursion detected in component "${(component.type as ComponentInternalRuntimeProps).name || 'anonymous'}". ` +
          `Check for circular component references or missing termination conditions.`,
      );
    }
    componentRecursionDepthMap.set(component, currentDepth + 1);

    // 调用 render 函数获取 subTree：优先使用 instance.render（来自 setup 函数的返回值）
    const renderFn =
      (component as unknown as { render?: (ctx: Record<string, unknown>) => VNode }).render ??
      (component.type as ComponentInternalRuntimeProps).render;
    if (!renderFn) {
      warn(
        `Component "${(component.type as ComponentInternalRuntimeProps).name || 'anonymous'}" has no render function.`,
      );
      return;
    }

    let isMounted = false;
    let initialSubTree: VNode | null = null;

    const update = () => {
      let subTree: VNode;
      try {
        const result = renderFn.call(component!.ctx, component!.ctx) as
          | VNode
          | VNode[]
          | null
          | undefined;
        // ⚠️ 2026-10-01 修复：渲染函数返回**数组**（多根组件）时必须**包一层 Fragment**。
        // 否则 `subTree` 是一个数组，后续 patch / unmount 会按单个 vnode 处理 ⇒ **渲染为空**。
        // 触发者：`Transition` / `Suspense` 的渲染函数是 `() => slots.default?.()`，
        // 而插槽契约就是 `{default:()=>[vnode]}` ⇒ 天然返回数组（此前它们一律渲染为空）。
        subTree = Array.isArray(result)
          ? (createVNode(Fragment as never, null, result as never) as unknown as VNode)
          : (result as VNode);
      } catch (err) {
        // 通过父链的 errorCaptured 传播错误
        const renderError = err instanceof Error ? err : new Error(String(err));
        let handled = false;
        let current: ComponentInternalInstance | null = component!.parent;
        while (current) {
          const type = current.type as ComponentInternalRuntimeProps;
          const errorHandler = type.errorCaptured;
          if (errorHandler) {
            try {
              const result = errorHandler.call(
                current.ctx,
                renderError,
                current,
                'render function',
              );
              if (result === false) {
                handled = true;
                break;
              }
            } catch (e) {
              error(`Error in errorCaptured hook: ${e}`);
            }
          }
          // 同时检查 errorCapturedHooks（来自 onErrorCaptured API）
          const hooks = (current as unknown as Record<string, unknown>).errorCapturedHooks as
            | Array<(err: Error, instance: unknown, info: string) => boolean | void>
            | undefined;
          if (hooks && hooks.length > 0) {
            for (const hook of hooks) {
              try {
                const result = hook(renderError, current, 'render function');
                if (result === false) {
                  handled = true;
                  break;
                }
              } catch (e) {
                error(`Error in errorCaptured hook: ${e}`);
              }
            }
            if (handled) break;
          }
          current = current.parent;
        }

        // 如果没有被任何组件处理，尝试应用级 errorHandler
        if (!handled && component!.root) {
          const rootAny = component!.root as unknown as Record<string, unknown>;
          const appContext = rootAny.appContext as Record<string, unknown> | undefined;
          const appErrorHandler = appContext?.config as Record<string, unknown> | undefined;
          if (appErrorHandler && typeof appErrorHandler.errorHandler === 'function') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
            (appErrorHandler.errorHandler as Function)(
              renderError,
              component!.ctx,
              'render function',
            );
          }
        }

        throw renderError;
      }

      // 应用 inheritAttrs：将实例的 attrs 合并到根 VNode props
      const componentType = component!.type as ComponentInternalRuntimeProps;
      if (component!.attrs && subTree) {
        const attrs = component!.attrs;
        const attrsKeys = Object.keys(attrs);
        if (attrsKeys.length > 0) {
          // 获取现有的 props，如果没有则使用空对象
          const existingProps = subTree.props ?? {};

          if (componentType.inheritAttrs !== false) {
            // inheritAttrs !== false: 合并所有 attrs
            // 只有当 existingProps 不为空或需要合并时才创建新对象
            if (Object.keys(existingProps).length > 0 || attrsKeys.length > 0) {
              subTree.props = Object.assign({}, existingProps, attrs);
            } else {
              subTree.props = attrs;
            }
          } else {
            // inheritAttrs === false: 仅合并 class 和 style（Vue 3 行为）
            // class 和 style 是视觉相关属性，即使 inheritAttrs 为 false 也应继承到根元素
            const hasClass = 'class' in attrs;
            const hasStyle = 'style' in attrs;

            if (hasClass || hasStyle) {
              // 只有当需要合并时才创建新对象
              if (Object.keys(existingProps).length > 0) {
                const rootProps = Object.assign({}, existingProps);
                if (hasClass) rootProps.class = attrs.class;
                if (hasStyle) rootProps.style = attrs.style;
                subTree.props = rootProps;
              } else {
                // existingProps 为空，直接创建包含 class/style 的对象
                subTree.props = {
                  ...(hasClass && { class: attrs.class }),
                  ...(hasStyle && { style: attrs.style }),
                };
              }
            }
          }
        }
      }

      component!.subTree = subTree;

      if (!isMounted) {
        // 首次挂载
        patch(null, subTree, container, anchor, component, parentSuspense, isSVG);
        vnode.el = subTree.el;
        isMounted = true;
        initialSubTree = subTree;
        // ⚠️ 2026-09-26 新增：此前 vdom **从不调用** mounted 钩子 ——
        // `callMountedHook` 的调用点只存在于 component 的导出/文档/测试里，
        // 于是 `onMounted` 在生产 VNode 路径**永不执行**（依赖它的代码静默失效）。
        // 现通过回调注入（与 setupChildComponent 同模式）由 core 提供实现。
        ctx.invokeMountedHook?.(component!);
      } else {
        // 更新
        patch(initialSubTree, subTree, container, anchor, component, parentSuspense, isSVG);
        vnode.el = subTree.el;
        initialSubTree = subTree;
        ctx.invokeUpdatedHook?.(component!);
      }
    };

    // Set up the update function on the component instance
    (component as unknown as { update: () => void }).update = update;

    // ============================================================
    // 把「渲染器的 unmount」暴露到组件实例上
    // ============================================================
    // ⚠️ 2026-09-29 新增：KeepAlive 淘汰缓存条目时需要**真正卸载**该组件
    // （递归处理其 subTree 内的嵌套组件、移除 DOM、触发 beforeUnmount/unmounted），
    // 但 `@lytjs/component` **拿不到渲染器实例**（vdom 不能反向依赖 component，
    // 而 component 依赖 vdom —— 只能由 vdom 主动把能力交出去）。
    //
    // 与上方 `component.update` 同款：vdom 在挂载时把渲染器能力写到实例上，
    // 组件（KeepAlive）按需读取。用 `doRemove = true` 保证 DOM 一并移除。
    (component as unknown as { __rendererUnmount?: (vnode: VNode) => void }).__rendererUnmount = (
      v: VNode,
    ) => ctx.unmount(v, null, null, true);

    // 组件首次挂载的调试信息：仅在 DEV 且开启调试开关时输出
    if (__DEV__) {
      debugMount(component);
    }

    // Run the initial update (mount)
    watchEffect(update);
  }

  return {
    mountComponent,
  };
}

/**
 * DEV 下的组件挂载调试输出（此前这里是一段只赋值不使用的死代码）
 */
function debugMount(component: { type: unknown }): void {
  if (!__DEV__) return;
  const name = (component.type as ComponentInternalRuntimeProps).name || 'anonymous';
  // eslint-disable-next-line no-console
  console.debug(`[LytJS] component mounted: ${name}`);
}
