/**
 * 跨平台渲染器工厂
 *
 * @description
 * 基于平台适配器创建渲染器实例，提供统一的 render/unmount API，
 * 屏蔽底层平台差异。
 */

import { isFunction, isObject, isString } from '@lytjs/common-is';
import type { VNode } from '@lytjs/common-vnode';
import type { PlatformAdapter, PlatformConfig } from './types';

/**
 * 平台渲染器接口
 *
 * @description
 * 封装了平台适配器，提供高层的渲染和卸载 API。
 *
 * @template HN - 宿主节点类型
 * @template HE - 宿主元素类型（extends HN）
 */
export interface PlatformRenderer<HN, HE extends HN> {
  /**
   * 将 VNode 渲染到指定容器中
   *
   * @param vnode - 要渲染的虚拟节点
   * @param container - 宿主容器节点
   */
  render(vnode: VNode, container: HN): void;

  /**
   * 卸载指定容器中的内容
   *
   * @param container - 宿主容器节点
   */
  unmount(container: HN): void;

  /**
   * 获取关联的平台适配器
   *
   * @returns 平台适配器实例
   */
  getAdapter(): PlatformAdapter<HN, HE>;
}

/**
 * 创建平台渲染器
 *
 * @description
 * 工厂函数，基于给定的平台适配器和配置创建渲染器实例。
 * 渲染器内部委托适配器完成实际的 DOM 操作。
 *
 * @template HN - 宿主节点类型
 * @template HE - 宿主元素类型（extends HN）
 * @param adapter - 平台适配器实例
 * @param config - 平台配置（可选）
 * @returns 平台渲染器实例
 *
 * @example
 * ```typescript
 * const renderer = createPlatformRenderer(myAdapter, { debug: true });
 * renderer.render(vnode, container);
 * ```
 */
export function createPlatformRenderer<HN, HE extends HN>(
  adapter: PlatformAdapter<HN, HE>,
  config?: PlatformConfig,
): PlatformRenderer<HN, HE> {
  // 当前容器中已渲染的子节点引用
  let currentChild: HN | null = null;

  const renderer: PlatformRenderer<HN, HE> = {
    /**
     * 将 VNode 渲染到容器中
     *
     * @description
     * 根据 vnode 类型创建对应的宿主节点，并插入到容器中。
     * 如果容器中已有内容，会先卸载再重新渲染。
     */
    render(vnode: VNode, container: HN): void {
      // 先卸载已有内容
      if (currentChild !== null) {
        this.unmount(container);
      }

      const node = createHostNodeFromVNode(adapter, vnode);
      if (node !== null) {
        adapter.insert(node, container, null);
        currentChild = node;
      }

      if (config?.debug) {
        // eslint-disable-next-line no-console
        console.log(`[platform-adapter:${adapter.name}] 渲染完成`, vnode);
      }
    },

    /**
     * 卸载容器中的内容
     */
    unmount(_container: HN): void {
      if (currentChild !== null) {
        adapter.remove(currentChild);
        currentChild = null;
      }

      if (config?.debug) {
        // eslint-disable-next-line no-console
        console.log(`[platform-adapter:${adapter.name}] 卸载完成`);
      }
    },

    /**
     * 获取关联的平台适配器
     */
    getAdapter(): PlatformAdapter<HN, HE> {
      return adapter;
    },
  };

  return renderer;
}

/**
 * 根据 VNode 类型创建宿主节点
 *
 * @description
 * 将 VNode 映射为平台适配器可操作的宿主节点。
 * 支持元素节点、文本节点和注释节点。
 *
 * @param adapter - 平台适配器
 * @param vnode - 虚拟节点
 * @returns 宿主节点，无法识别的类型返回 null
 */
function createHostNodeFromVNode<HN, HE extends HN>(
  adapter: PlatformAdapter<HN, HE>,
  vnode: VNode,
): HN | null {
  const { type, children } = vnode;

  // 元素节点
  if (isString(type)) {
    const el = adapter.createElement(type);

    // 设置属性
    //
    // ⚠️ 2026-10-31 修（P0）：此前**只处理字符串值**（`isString(value)`），
    //   数字 / 布尔 / 对象 / 事件处理器全部被静默丢弃 —— 实测 `data-n: 42`
    //   不写入、`onClick` 不绑定、`disabled: true` 无效。现在按类型分派。
    if (vnode.props) {
      for (const [key, value] of Object.entries(vnode.props)) {
        if (value === null || value === undefined) continue;

        if (key === 'style') {
          if (isString(value)) adapter.setStyle(el, value);
          else if (isObject(value)) {
            adapter.setStyle(
              el,
              Object.entries(value as Record<string, unknown>)
                .map(([k, v]) => `${k}: ${String(v)}`)
                .join('; '),
            );
          }
          continue;
        }

        if (key === 'class') {
          if (isString(value)) adapter.addClass(el, value);
          else if (Array.isArray(value)) adapter.addClass(el, value.filter(Boolean).join(' '));
          continue;
        }

        // 事件：`onClick` → `click`
        if (typeof value === 'function' && /^on[A-Z]/.test(key)) {
          adapter.addEventListener(
            el,
            key.slice(2).toLowerCase(),
            value as (...a: unknown[]) => void,
          );
          continue;
        }

        // 布尔属性：`true` 写成空串（HTML 语义），`false` 不写
        if (typeof value === 'boolean') {
          if (value) adapter.setAttribute(el, key, '');
          continue;
        }

        adapter.setAttribute(el, key, typeof value === 'string' ? value : String(value));
      }
    }

    // 递归处理子节点
    //
    // ⚠️ 2026-10-27 修（P0）：此前**只处理字符串**子节点，数组/单个 VNode 被整棵丢弃 ——
    //   实测 `<div><span/></div>` 渲染出的是一个空 `<div>`，且不报错。
    //   现在按「数组 → 逐个递归 + insert」「单个 vnode → 递归 + insert」「字符串 → 文本」分派。
    if (Array.isArray(children)) {
      for (const child of children) {
        if (child === null || child === undefined || typeof child === 'boolean') continue;
        if (isString(child)) {
          adapter.insert(adapter.createText(child), el as unknown as HN);
          continue;
        }
        if (isObject(child)) {
          const childNode = createHostNodeFromVNode(adapter, child as VNode);
          if (childNode) adapter.insert(childNode, el as unknown as HN);
        }
      }
    } else if (isString(children)) {
      adapter.setElementText(el, children);
    } else if (isObject(children)) {
      const childNode = createHostNodeFromVNode(adapter, children as unknown as VNode);
      if (childNode) adapter.insert(childNode, el as unknown as HN);
    }

    return el as unknown as HN;
  }

  // 文本节点
  if (isString(children)) {
    return adapter.createText(children);
  }

  // 注释节点
  if (isFunction(type) === false && type !== null && !isString(type)) {
    // 非 string、非 function、非 null 的 type 可能是 Comment Symbol
    return adapter.createComment(String(children ?? ''));
  }

  return null;
}
