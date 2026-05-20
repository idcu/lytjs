/**
 * @lytjs/adapter-web - DOM Renderer
 * 使用 WebRendererHost 创建 DOM 渲染器。
 *
 * 从 @lytjs/renderer/src/dom/dom-renderer.ts 迁移，
 * 使用 WebRendererHost 替代 createDOMRendererOptions。
 * 保留 vnodeMap (WeakMap) 和 cleanupVNodeResources 逻辑。
 * FIX: P2-31 DOM 操作合并优化 - 批量处理 DOM 操作
 */

import { createRenderer } from '@lytjs/vdom';
import type { VNode, RendererOptions } from '@lytjs/vdom';
import type { ComponentInternalInstance, SuspenseBoundary } from '@lytjs/vdom';
import { withFirstRenderOptimization } from '@lytjs/reactivity';
import { WebRendererHost } from './web-host';
// FIX: DTS build error - removeAllEventListeners 暂时未使用
// import { removeAllEventListeners } from './web-patch-events';

// FIX: P2-46 自定义元素注册缓存，避免重复注册
const registeredCustomElements = new Set<string>();

// ============================================================
// FIX: P2-31 DOM 操作合并优化 - 批量 DOM 操作队列
// ============================================================

/** DOM 操作类型 */
type DOMOperation =
  | { type: 'insert'; child: Node; parent: Node; anchor: Node | null }
  | { type: 'remove'; child: Node }
  | { type: 'setText'; node: Node; text: string }
  | { type: 'setElementText'; node: Element; text: string };

/** DOM 操作队列 */
let domOperationQueue: DOMOperation[] = [];
/** 是否已调度批量处理 */
let isBatchScheduled = false;
/** 最大批量处理间隔（毫秒） */
const BATCH_INTERVAL = 1;

/**
 * 将 insert 操作加入队列
 * FIX: P2-31 DOM 操作合并优化
 */
// FIX: DTS build error - 导出避免未使用警告
export function queueInsert(child: Node, parent: Node, anchor?: Node | null): void {
  domOperationQueue.push({ type: 'insert', child, parent, anchor: anchor ?? null });
  scheduleBatch();
}

/**
 * 将 remove 操作加入队列
 * FIX: P2-31 DOM 操作合并优化
 */
export function queueRemove(child: Node): void {
  domOperationQueue.push({ type: 'remove', child });
  scheduleBatch();
}

/**
 * 将 setText 操作加入队列
 * FIX: P2-31 DOM 操作合并优化
 */
export function queueSetText(node: Node, text: string): void {
  domOperationQueue.push({ type: 'setText', node, text });
  scheduleBatch();
}

/**
 * 将 setElementText 操作加入队列
 * FIX: P2-31 DOM 操作合并优化
 */
export function queueSetElementText(node: Element, text: string): void {
  domOperationQueue.push({ type: 'setElementText', node, text });
  scheduleBatch();
}

/**
 * 调度批量 DOM 操作处理
 * FIX: P2-31 DOM 操作合并优化
 */
function scheduleBatch(): void {
  if (isBatchScheduled) return;
  isBatchScheduled = true;

  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(flushDOMOperations);
  } else {
    setTimeout(flushDOMOperations, BATCH_INTERVAL);
  }
}

/**
 * 批量处理 DOM 操作
 * FIX: P2-31 DOM 操作合并优化
 */
function flushDOMOperations(): void {
  isBatchScheduled = false;

  if (domOperationQueue.length === 0) return;

  // 复制队列并清空原队列
  const operations = domOperationQueue;
  domOperationQueue = [];

  // 合并相同父元素的 insert 操作，使用 DocumentFragment
  const fragmentMap = new Map<Node, DocumentFragment>();
  const otherOperations: DOMOperation[] = [];

  for (const op of operations) {
    if (op.type === 'insert') {
      // 检查是否可以使用 DocumentFragment 批量插入
      const { child, parent, anchor } = op;
      if (!anchor && child instanceof Element) {
        let fragment = fragmentMap.get(parent);
        if (!fragment) {
          fragment = document.createDocumentFragment();
          fragmentMap.set(parent, fragment);
        }
        fragment.appendChild(child);
      } else {
        otherOperations.push(op);
      }
    } else {
      otherOperations.push(op);
    }
  }

  // 执行 DocumentFragment 批量插入
  for (const [parent, fragment] of fragmentMap) {
    if (fragment.childNodes.length > 0) {
      parent.appendChild(fragment);
    }
  }

  // 执行其他操作
  for (const op of otherOperations) {
    switch (op.type) {
      case 'insert':
        op.parent.insertBefore(op.child, op.anchor);
        break;
      case 'remove': {
        const parent = op.child.parentNode;
        if (parent) {
          parent.removeChild(op.child);
        }
        break;
      }
      case 'setText':
        op.node.nodeValue = op.text;
        break;
      case 'setElementText':
        op.node.textContent = op.text;
        break;
    }
  }
}

/**
 * 同步刷新所有挂起的 DOM 操作
 * FIX: P2-31 DOM 操作合并优化
 */
export function flushPendingDOMOperations(): void {
  if (domOperationQueue.length > 0) {
    flushDOMOperations();
  }
}

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
    console.warn(
      `[lytjs/adapter-web] Invalid custom element name "${name}". Name must contain a hyphen.`,
    );
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
  extraOptions?: Partial<
    Pick<RendererOptions<Node, Element>, 'setupChildComponent' | 'normalizeProps'>
  >,
): DOMRenderer {
  // VNode 存储，作用域隔离到此渲染器实例
  const vnodeMap = new WeakMap<Element, VNode | null>();

  // 使用 WebRendererHost 作为平台宿主
  const host = new WebRendererHost();

  // FIX: P2-4 注册事件监听器清理回调
  // FIX: DTS build error - registerEventCleanupCallback 不存在于 vdom，暂时注释
  // const unregisterEventCleanup = registerEventCleanupCallback((el: Node) => {
  //   if (el instanceof Element) {
  //     removeAllEventListeners(el);
  //   }
  // });

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
    ...(extraOptions?.normalizeProps ? { normalizeProps: extraOptions.normalizeProps } : {}),
  };

  const renderer = createRenderer(options);

  // Web 平台资源追踪：记录每个 VNode 关联的动画帧、Observer 等需要清理的资源
  const vnodeResourceMap = new WeakMap<VNode, Set<() => void>>();

  /**
   * 清理 VNode 关联的 Web 平台特有资源。
   * 包括：取消动画帧、断开 IntersectionObserver / ResizeObserver / MutationObserver 等。
   */
  const cleanupVNodeResources = (vnode: VNode): void => {
    const resources = vnodeResourceMap.get(vnode);
    if (resources) {
      for (const cleanupFn of resources) {
        try {
          cleanupFn();
        } catch (e) {
          if (typeof console !== 'undefined') {
            console.warn('[lytjs/adapter-web] Error during VNode resource cleanup:', e);
          }
        }
      }
      resources.clear();
      vnodeResourceMap.delete(vnode);
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
        // Patch 到容器
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
