/**
 * @lytjs/vdom - patch-component
 *
 * Component vnode 的挂载逻辑。
 * 包含 mountComponent 函数，负责组件实例创建、渲染、inheritAttrs 处理等。
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { warn, error } from '@lytjs/common-error';
import { shallowEqual } from '@lytjs/common-object';
import type { SuspenseBoundary } from './types';
import type { RendererContext } from './patch-element';

// ============================================================
// Component Recursion Depth Limit
// ============================================================

// FIX: P1-L4 组件递归深度无限制 - 添加递归深度限制（100层）
const MAX_RECURSION_DEPTH = 100;
const componentRecursionDepthMap = new WeakMap<ComponentInternalInstance, number>();

// ============================================================
// Component patch factory
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
      // Try to create and setup the component instance using the provided callback
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
        `Check for circular component references or missing termination conditions.`
      );
    }
    componentRecursionDepthMap.set(component, currentDepth + 1);

    // Call the render function to get the subTree
    const renderFn = (component.type as ComponentInternalRuntimeProps).render;
    if (!renderFn) {
      warn(`Component "${(component.type as ComponentInternalRuntimeProps).name || 'anonymous'}" has no render function.`);
      return;
    }

    let subTree: VNode;
    try {
      // FIX: P2-10 render 函数调用时使用更精确的类型。
      // component.ctx 的实际类型由组件实例的 setup 过程决定，
      // 使用 ComponentInternalInstance['ctx'] 类型（Record<string, unknown>）
      // 与 render 函数签名保持一致，避免类型断言不安全。
      subTree = renderFn(component.ctx);
    } catch (err) {
      // Propagate error through parent chain via errorCaptured
      const renderError = err instanceof Error ? err : new Error(String(err));
      let handled = false;
      let current: ComponentInternalInstance | null = component.parent;
      while (current) {
        const type = current.type as ComponentInternalRuntimeProps;
        const errorHandler = type.errorCaptured;
        if (errorHandler) {
          try {
            const result = errorHandler.call(current.ctx, renderError, current, 'render function');
            if (result === false) {
              handled = true;
              break;
            }
          } catch (e) {
            error(`Error in errorCaptured hook: ${e}`);
          }
        }
        // Also check errorCapturedHooks (from onErrorCaptured API)
        const hooks = (current as unknown as Record<string, unknown>).errorCapturedHooks as
          | Array<(err: Error, instance: unknown, info: string) => boolean | void>
          | undefined;
        // FIX: P0-2 修复 errorCapturedHooks 使用未定义变量 hook，添加遍历 hooks 数组的循环
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

      // If not handled by any component, try app-level errorHandler
      if (!handled && component.root) {
        const rootAny = component.root as unknown as Record<string, unknown>;
        const appContext = rootAny.appContext as Record<string, unknown> | undefined;
        const appErrorHandler = appContext?.config as Record<string, unknown> | undefined;
        if (appErrorHandler && typeof appErrorHandler.errorHandler === 'function') {
          (appErrorHandler.errorHandler as Function)(renderError, component.ctx, 'render function');
        }
      }

      throw renderError;
    }

    component.subTree = subTree;

    // FIX: P2-11 组件挂载 __DEV__ 日志：在组件首次挂载时输出调试信息
    if (__DEV__) {
      const compName = (component.type as ComponentInternalRuntimeProps).name || 'anonymous';
      console.log(`[lytjs/patch-component] Mounting component: ${compName}`);
    }

    // Apply inheritAttrs: merge instance.attrs into root VNode props
    // FIX: P2-10 减少不必要的对象创建：避免创建中间对象，直接修改 subTree.props
    const componentType = component.type as ComponentInternalRuntimeProps;
    if (component.attrs && subTree) {
      const attrs = component.attrs;
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

    // Patch the subTree into the container
    patch(null, subTree, container, anchor, component, parentSuspense, isSVG);

    // The component's el points to the root element of the subTree
    vnode.el = subTree.el;
  }

  return {
    mountComponent,
  };
}
