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

// FIX: P2-46 自定义元素注册缓存，避免重复注册
const registeredCustomElements = new Set<string>();

// ============================================================
// defineCustomElement - 自定义元素注册
// ============================================================

/**
 * 注册自定义元素（Web Component）。
 * 使用 registeredCustomElements Set 进行缓存，避免重复注册。
 *
 * @param name - 自定义元素名称（必须包含连字符）
 * @param constructor - 自定义元素构造函数
 * @param options - 可选的注册选项（如 extends）
 * @returns 是否成功注册（false 表示已存在或注册失败）
 */
export function defineCustomElement(
  name: string,
  constructor: CustomElementConstructor,
  options?: ElementDefinitionOptions,
): boolean {
  // FIX: P2-46 使用 Set 进行缓存，避免重复注册
  if (registeredCustomElements.has(name)) {
    return false;
  }

  // 检查浏览器是否支持 customElements
  if (typeof customElements === 'undefined') {
    console.warn(`[lytjs/adapter-web] customElements API not supported in this environment.`);
    return false;
  }

  // 检查名称是否有效（必须包含连字符）
  if (!name.includes('-')) {
    console.warn(`[lytjs/adapter-web] Invalid custom element name "${name}". Name must contain a hyphen.`);
    return false;
  }

  // 检查是否已被其他代码注册
  if (customElements.get(name)) {
    registeredCustomElements.add(name);
    return false;
  }

  try {
    customElements.define(name, constructor, options);
    registeredCustomElements.add(name);
    return true;
  } catch (err) {
    console.warn(`[lytjs/adapter-web] Failed to define custom element "${name}":`, err);
    return false;
  }
}

/**
 * 检查自定义元素是否已注册。
 *
 * @param name - 自定义元素名称
 * @returns 是否已注册
 */
export function isCustomElementRegistered(name: string): boolean {
  return registeredCustomElements.has(name);
}

/**
 * 获取已注册的自定义元素名称列表。
 *
 * @returns 已注册的自定义元素名称数组
 */
export function getRegisteredCustomElements(): string[] {
  return Array.from(registeredCustomElements);
}

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
  extraOptions?: Partial<Pick<RendererOptions<Node, Element>, 'setupChildComponent' | 'normalizeProps'>>,
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
      // FIX: P1-55 getNamespaceURI 非空断言改为条件检查，
      // 避免在 getNamespaceURI 未定义时抛出运行时错误
      const isSVG = host.getNamespaceURI
        ? host.getNamespaceURI(el) === 'http://www.w3.org/2000/svg'
        : false;
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
    ...(extraOptions?.normalizeProps
      ? { normalizeProps: extraOptions.normalizeProps }
      : {}),
  };

  const renderer = createRenderer(options);

  // TODO: cleanupVNodeResources 当前为空实现，组件资源清理由上层 renderer 的
  // cleanupComponentResources 处理。如果后续需要在此处添加 Web 平台特有的
  // 资源清理逻辑（如取消动画帧、清理 IntersectionObserver 等），请在此实现。
  // 参见 https://github.com/lytjs/lytjs/issues/xxx
  const cleanupVNodeResources = (_vnode: VNode): void => {
    // 当前为空实现，保留接口兼容性
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
