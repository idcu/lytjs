/**
 * @lytjs/vdom - patch-component
 *
 * Component vnode 的挂载逻辑。
 * 包含 mountComponent 函数，负责组件实例创建、渲染、inheritAttrs 处理等。
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { warn, error } from '@lytjs/common-error';
import { watchEffect } from '@lytjs/reactivity';
import type { SuspenseBoundary } from './types';
import type { RendererContext } from './patch-element';

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
        subTree = renderFn.call(component!.ctx, component!.ctx);
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
      } else {
        // 更新
        patch(initialSubTree, subTree, container, anchor, component, parentSuspense, isSVG);
        vnode.el = subTree.el;
        initialSubTree = subTree;
      }
    };

    // Set up the update function on the component instance
    (component as unknown as { update: () => void }).update = update;

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
