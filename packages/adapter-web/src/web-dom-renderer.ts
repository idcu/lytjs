/**
 * @lytjs/adapter-web - DOM Renderer
 * 使用 WebRendererHost 创建 DOM 渲染器。
 *
 * 从 @lytjs/renderer/src/dom/dom-renderer.ts 迁移，
 * 使用 WebRendererHost 替代 createDOMRendererOptions。
 * 保留 vnodeMap (WeakMap) 和 cleanupVNodeResources 逻辑。
 */

import { createRenderer } from '@lytjs/vdom';
import type { VNode, RendererOptions } from '@lytjs/vdom';
import type { ComponentInternalInstance, SuspenseBoundary } from '@lytjs/vdom';
import { withFirstRenderOptimization } from '@lytjs/reactivity';
import { WebRendererHost } from './web-host';

// ============================================================
// DOMRenderer 接口
// ============================================================

export interface DOMRenderer {
  render(vnode: VNode | null, container: Element): void;
  patch(n1: VNode | null, n2: VNode, container: Node, anchor?: Node | null): void;
  unmount(vnode: VNode): void;
  mount(vnode: VNode, container: Node): void;
  move(
    vnode: VNode,
    container: Node,
    anchor: Node | null,
    _parentComponent?: ComponentInternalInstance | null,
    _parentSuspense?: SuspenseBoundary | null,
  ): void;
}

// ============================================================
// createDOMRenderer
// ============================================================

/**
 * 创建 DOM 渲染器。
 *
 * 使用 WebRendererHost 作为平台适配层，通过 vdom 的 createRenderer
 * 创建完整的渲染器实例。vnodeMap 通过闭包作用域隔离。
 *
 * @param extraOptions 可选的额外渲染器选项，例如 setupChildComponent
 */
export function createDOMRenderer(
  extraOptions?: Partial<Pick<RendererOptions<Node, Element>, 'setupChildComponent'>>,
): DOMRenderer {
  // VNode storage scoped to this renderer instance
  const vnodeMap = new WeakMap<Element, VNode | null>();

  // 使用 WebRendererHost 作为平台宿主
  const host = new WebRendererHost();

  // 将 WebRendererHost 转换为 vdom 的 RendererOptions 格式
  const options: RendererOptions<Node, Element> = {
    createElement(tag: string): Element {
      return host.createElement(tag);
    },
    setElementText(node: Element, text: string): void {
      host.setElementText(node, text);
    },
    insert(child: Node, parent: Node, anchor?: Node | null): void {
      host.insert(child, parent, anchor);
    },
    remove(child: Node): void {
      host.remove(child);
    },
    createText(text: string): Node {
      return host.createText(text);
    },
    setText(node: Node, text: string): void {
      host.setText(node, text);
    },
    nextSibling(node: Node): Node | null {
      return host.nextSibling(node);
    },
    parentNode(node: Node): Node | null {
      return host.parentNode(node);
    },
    patchProp(el: Element, key: string, prevValue: unknown, nextValue: unknown): void {
      const isSVG = host.getNamespaceURI!(el) === 'http://www.w3.org/2000/svg';
      host.patchProp(el, key, prevValue, nextValue, isSVG);
    },
    createComment(text: string): Node {
      return host.createComment(text);
    },
    querySelector(selector: string): Element | null {
      return host.querySelector(selector);
    },
    ...(extraOptions?.setupChildComponent
      ? { setupChildComponent: extraOptions.setupChildComponent }
      : {}),
  };

  const renderer = createRenderer(options);

  const cleanupVNodeResources = (vnode: VNode): void => {
    if (vnode.component) {
      // 组件资源清理：通过 host 的 removeEventListener 处理
      // 具体清理逻辑由上层（renderer）的 cleanupComponentResources 处理
      // 此处保留接口兼容性
    }
  };

  return {
    render(vnode: VNode | null, container: Element): void {
      if (vnode == null) {
        // Unmount: trigger lifecycle hooks before clearing DOM
        const existing = vnodeMap.get(container);
        if (existing) {
          cleanupVNodeResources(existing);
          renderer.unmount(existing);
          vnodeMap.delete(container);
        }
        if (container.firstChild) {
          // Use replaceChildren instead of innerHTML to avoid memory leaks
          if (typeof container.replaceChildren === 'function') {
            container.replaceChildren();
          } else {
            while (container.firstChild) {
              container.removeChild(container.firstChild);
            }
          }
        }
      } else {
        // Patch into container
        const existing = vnodeMap.get(container) ?? null;
        if (existing === null) {
          // 首次挂载：包裹 withFirstRenderOptimization 跳过依赖收集
          withFirstRenderOptimization(() => {
            renderer.patch(null, vnode, container);
          });
        } else {
          // 后续更新：正常 patch，依赖正常收集
          renderer.patch(existing, vnode, container);
        }
        vnodeMap.set(container, vnode);
      }
    },
    patch: renderer.patch,
    unmount(vnode: VNode): void {
      cleanupVNodeResources(vnode);
      renderer.unmount(vnode);
    },
    mount: renderer.mount,
    move(
      vnode: VNode,
      container: Node,
      anchor: Node | null,
      _parentComponent?: ComponentInternalInstance | null,
      _parentSuspense?: SuspenseBoundary | null,
    ): void {
      renderer.move(vnode, container, anchor, _parentComponent ?? null, _parentSuspense ?? null);
    },
  };
}
