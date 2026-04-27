/**
 * Lyt.js Vapor Mode - 组件系统
 *
 * 提供 Vapor Mode 的组件定义和 App 创建功能。
 * 与标准 defineComponent 类似，但使用 Vapor 渲染器（无 VDOM）。
 */

import type { VaporNode, VaporComponentOptions, VaporApp, VaporContainer } from './vapor-renderer';
import { renderVaporNode, vaporMount, getVaporDOMFactory, createVaporElement } from './vapor-renderer';
import type { VaporElement } from './vapor-reactive';
import { compileToVapor } from './vapor-compiler';

// ================================================================
//  Vapor 组件实例
// ================================================================

/** Vapor 组件实例 */
export interface VaporComponentInstance {
  /** 组件选项 */
  options: VaporComponentOptions
  /** 组件上下文（setup 返回值） */
  ctx: Record<string, unknown>
  /** 根 DOM 元素 */
  el: VaporElement | null
  /** 是否已挂载 */
  isMounted: boolean
  /** 父组件实例 */
  parent: VaporComponentInstance | null
  /** 子组件实例 */
  children: VaporComponentInstance[]
  /** 传递的 props */
  props: Record<string, unknown>
  /** 卸载函数 */
  _unmount?: () => void
}

// ================================================================
//  defineVaporComponent
// ================================================================

/**
 * 定义 Vapor 组件
 *
 * 与 defineComponent 类似，但使用 Vapor Mode 渲染。
 * 不创建 VDOM，直接操作 DOM。
 *
 * @param options  组件选项
 * @returns 组件构造函数
 */
export function defineVaporComponent(options: VaporComponentOptions): VaporComponentOptions {
  // 标记为 Vapor 组件
  (options as Record<string, unknown>).__vapor__ = true;
  return options;
}

// ================================================================
//  createVaporApp
// ================================================================

/**
 * 创建 Vapor Mode 应用
 *
 * 类似 createApp，但使用 Vapor 渲染器。
 *
 * @param rootComponent  根组件选项
 * @returns VaporApp 实例
 */
export function createVaporApp(rootComponent: VaporComponentOptions): VaporApp {
  let mounted = false;
  let unmountFn: (() => void) | null = null;
  let container: VaporContainer | null = null;

  return {
    /**
     * 挂载到容器
     */
    mount(target: VaporContainer | string): void {
      if (mounted) {
        console.warn('[lyt:vapor] App 已经挂载，不能重复挂载');
        return;
      }

      // 如果传入的是字符串选择器，尝试获取 DOM 元素
      if (typeof target === 'string') {
        if (typeof document !== 'undefined') {
          const el = document.querySelector(target);
          if (!el) {
            throw new Error(`[lyt:vapor] 未找到挂载目标: ${target}`);
          }
          container = el as unknown as VaporContainer;
        } else {
          throw new Error('[lyt:vapor] 在非浏览器环境中，请直接传入容器元素');
        }
      } else {
        container = target;
      }

      unmountFn = vaporMount(container, rootComponent);
      mounted = true;
    },

    /**
     * 卸载应用
     */
    unmount(): void {
      if (!mounted) {
        console.warn('[lyt:vapor] App 未挂载，不能卸载');
        return;
      }

      if (unmountFn) {
        unmountFn();
        unmountFn = null;
      }

      mounted = false;
      container = null;
    },
  };
}

// ================================================================
//  Vapor 组件渲染器
// ================================================================

/**
 * 渲染 Vapor 组件为 DOM 元素
 *
 * @param component  组件选项
 * @param props      传递给组件的 props
 * @returns 渲染后的 DOM 元素
 */
export function renderVaporComponent(
  component: VaporComponentOptions,
  props?: Record<string, unknown>
): VaporElement {
  // 合并 props 到上下文
  const ctx = component.setup
    ? { ...component.setup(), ...props }
    : { ...props };

  if (component.beforeMount) component.beforeMount();

  let el: VaporElement;

  if (component.template) {
    // 使用模板编译
    const { render } = compileToVapor(component.template);
    el = render(ctx);
  } else if (component.render) {
    // 使用渲染函数（使用主 createVaporElement 以支持 Signal 绑定）
    const result = component.render(ctx, createVaporElement);
    const nodes: VaporNode[] = Array.isArray(result) ? result : [result];
    if (nodes.length === 1) {
      el = renderVaporNode(nodes[0]);
    } else {
      // 多根节点，创建容器
      const factory = getVaporDOMFactory();
      el = factory('div');
      for (const node of nodes) {
        el.appendChild(renderVaporNode(node));
      }
    }
  } else {
    throw new Error('[lyt:vapor] 组件必须提供 template 或 render 函数');
  }

  if (component.mounted) component.mounted();

  return el;
}

// ================================================================
//  导出
// ================================================================
