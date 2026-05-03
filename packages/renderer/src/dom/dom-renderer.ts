/**
 * @lytjs/renderer - DOM Renderer
 * Creates a DOM renderer using vdom's createRenderer with enhanced patchProp
 */

import { createRenderer, createDOMRendererOptions } from '@lytjs/vdom';
import type { VNode, RendererOptions } from '@lytjs/vdom';
import type { ComponentInternalInstance, SuspenseBoundary } from '@lytjs/vdom';
import { patchProp } from './patch-props';
import { withFirstRenderOptimization } from '@lytjs/reactivity';
import { cleanupComponentResources } from '../unmount';
import type { ResourceCleanupRenderer } from '../unmount';

import { SVG_NS, isSVGTag } from '@lytjs/common-dom';

// ============================================================
// createDOMRenderer
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

/**
 * Create a DOM renderer that uses vdom's createRenderer with enhanced patchProp.
 * vnodeMap is scoped to each renderer instance via closure (not module-level shared).
 */
export function createDOMRenderer(): DOMRenderer {
  // VNode storage scoped to this renderer instance
  const vnodeMap = new WeakMap<Element, VNode | null>();

  // Get vdom's DOM host options
  const hostOptions = createDOMRendererOptions();

  // Override patchProp with our enhanced version that handles
  // class, style, events, and attributes properly
  // Also override createElement to handle SVG namespace
  const options: RendererOptions<Node, Element> = {
    ...hostOptions,
    createElement(tag: string): Element {
      if (isSVGTag(tag)) {
        return document.createElementNS(SVG_NS, tag);
      }
      return document.createElement(tag);
    },
    patchProp(el: Element, key: string, prevValue: unknown, nextValue: unknown): void {
      const isSVG = (el as Element).namespaceURI === SVG_NS;
      patchProp(el, key, prevValue, nextValue, isSVG);
    },
    querySelector(selector: string): Element | null {
      return document.querySelector(selector);
    },
  };

  const renderer = createRenderer(options);

  return {
    render(vnode: VNode | null, container: Element): void {
      if (vnode == null) {
        // Unmount: trigger lifecycle hooks before clearing DOM
        const existing = vnodeMap.get(container);
        if (existing) {
          renderer.unmount(existing);
          vnodeMap.delete(container);
        }
        if (container.firstChild) {
          // Use replaceChildren instead of innerHTML to avoid memory leaks
          // from event listeners and other references not being cleaned up
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
      // 在卸载前清理组件注册资源
      if (vnode.component) {
        const cleanupRenderer: ResourceCleanupRenderer = {
          removeEventListener(el: unknown, event: string, handler: (...args: unknown[]) => void): void {
            if (el instanceof EventTarget) {
              el.removeEventListener(event, handler as EventListener);
            }
          },
        };
        cleanupComponentResources(cleanupRenderer, vnode.component);
      }
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
