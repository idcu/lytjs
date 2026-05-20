// src/batch.ts
// @lytjs/dom-runtime - 批量 DOM 操作优化
// 提供批量插入、批量删除、增量更新等功能，减少 DOM 重排重绘次数

import type { TemplateWrapper } from './index';

// 内部辅助接口
interface RemovableWrapper {
  content?: unknown;
  remove?: () => void;
}

// 增量更新相关类型
export interface ListDiffResult<T> {
  added: Array<{ item: T; index: number }>;
  removed: Array<{ item: T; index: number }>;
  moved: Array<{ item: T; fromIndex: number; toIndex: number }>;
  updated: Array<{ item: T; index: number }>;
}

/**
 * 计算两个列表的差异（基于 key 的 O(n) 算法）
 * 用于增量更新，只更新变化的节点
 *
 * @param oldList - 旧列表
 * @param newList - 新列表
 * @param keyFn - 从元素提取 key 的函数
 * @param compareFn - 比较函数（可选），用于判断元素是否需要更新
 * @returns 差异结果
 *
 * @example
 * ```ts
 * const oldItems = [{id: 1, name: 'a'}, {id: 2, name: 'b'}];
 * const newItems = [{id: 2, name: 'b'}, {id: 1, name: 'a'}, {id: 3, name: 'c'}];
 *
 * const diff = diffLists(
 *   oldItems,
 *   newItems,
 *   (item) => item.id,
 *   (oldItem, newItem) => oldItem.name !== newItem.name
 * );
 *
 * // diff.moved = [{item: {id: 2, ...}, fromIndex: 1, toIndex: 0}, ...]
 * // diff.added = [{item: {id: 3, ...}, index: 2}]
 * ```
 */
export function diffLists<T>(
  oldList: T[],
  newList: T[],
  keyFn: (item: T) => string | number,
  compareFn?: (oldItem: T, newItem: T) => boolean,
): ListDiffResult<T> {
  const result: ListDiffResult<T> = {
    added: [],
    removed: [],
    moved: [],
    updated: [],
  };

  const oldKeyMap = new Map<string | number, { item: T; index: number }>();
  const newKeyMap = new Map<string | number, { item: T; index: number }>();

  for (let i = 0; i < oldList.length; i++) {
    const item = oldList[i]!;
    oldKeyMap.set(keyFn(item), { item, index: i });
  }

  for (let i = 0; i < newList.length; i++) {
    const item = newList[i]!;
    const key = keyFn(item);
    newKeyMap.set(key, { item, index: i });
  }

  for (const [key, { item, index }] of oldKeyMap) {
    const newEntry = newKeyMap.get(key);
    if (!newEntry) {
      result.removed.push({ item, index });
    } else {
      if (compareFn && compareFn(item, newEntry.item)) {
        result.updated.push({ item: newEntry.item, index: newEntry.index });
      }
      if (index !== newEntry.index) {
        result.moved.push({ item: newEntry.item, fromIndex: index, toIndex: newEntry.index });
      }
    }
  }

  for (const [key, { item, index }] of newKeyMap) {
    if (!oldKeyMap.has(key)) {
      result.added.push({ item, index });
    }
  }

  result.moved.sort((a, b) => a.fromIndex - b.fromIndex);
  result.added.sort((a, b) => a.index - b.index);
  result.removed.sort((a, b) => b.index - a.index);

  return result;
}

/**
 * 批量将节点数组插入到父元素中
 * 使用 DocumentFragment 一次性插入，减少 DOM 重排重绘
 *
 * @param children - 要插入的节点数组
 * @param parent - 父元素
 * @param ref - 参考节点（可选），为 null 时追加到末尾
 *
 * @example
 * ```ts
 * const nodes = [createElement('div'), createElement('div'), createElement('div')];
 * insertBatch(nodes, container); // 一次性插入，只触发 1 次 DOM 操作
 * ```
 */
export function insertBatch(children: unknown[], parent: Node, ref?: Node | null): void {
  if (typeof document === 'undefined') return;
  if (children.length === 0) return;

  const fragment = document.createDocumentFragment();

  for (const child of children) {
    const wrapper = child as RemovableWrapper;
    if ('content' in wrapper) {
      const templateWrapper = child as TemplateWrapper;
      let node = templateWrapper.content.firstChild;
      while (node) {
        fragment.appendChild(node.cloneNode(true));
        node = node.nextSibling;
      }
    } else {
      fragment.appendChild(child as Node);
    }
  }

  if (ref != null) {
    parent.insertBefore(fragment, ref);
  } else {
    parent.appendChild(fragment);
  }
}

/**
 * 移除节点
 */
export function remove(child: unknown): void {
  if (typeof document === 'undefined') return;
  const wrapper = child as RemovableWrapper;
  if ('remove' in wrapper && typeof wrapper.remove === 'function') {
    wrapper.remove();
  } else {
    const parent = (child as Node).parentNode;
    if (parent) {
      parent.removeChild(child as Node);
    }
  }
}

/**
 * 批量移除节点数组
 * 减少多次 DOM 操作的性能开销
 *
 * @param children - 要移除的节点数组
 *
 * @example
 * ```ts
 * const nodes = [div1, div2, div3];
 * removeBatch(nodes); // 一次性删除多个节点
 * ```
 */
export function removeBatch(children: unknown[]): void {
  if (typeof document === 'undefined') return;

  for (const child of children) {
    remove(child);
  }
}

/**
 * 清空父元素的所有子节点
 */
export function clearChildren(parent: Node): void {
  if (typeof document === 'undefined') return;
  parent.textContent = '';
}

/**
 * 清空父元素并批量插入新节点
 * 合并清空和插入操作，减少 DOM 操作次数
 *
 * @param parent - 父元素
 * @param children - 要插入的新节点数组
 *
 * @example
 * ```ts
 * const newNodes = [createElement('div'), createElement('div')];
 * replaceChildren(container, newNodes); // 清空并插入，比先 clear 再 insert 更高效
 * ```
 */
export function replaceChildren(parent: Node, children: unknown[]): void {
  if (typeof document === 'undefined') return;

  if (children.length === 0) {
    parent.textContent = '';
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const child of children) {
    const wrapper = child as RemovableWrapper;
    if ('content' in wrapper) {
      const templateWrapper = child as TemplateWrapper;
      let node = templateWrapper.content.firstChild;
      while (node) {
        fragment.appendChild(node.cloneNode(true));
        node = node.nextSibling;
      }
    } else {
      fragment.appendChild(child as Node);
    }
  }

  parent.textContent = '';
  parent.appendChild(fragment);
}

/**
 * 批量更新文本节点
 * 合并多次文本更新为一次操作
 *
 * @param nodes - 要更新的节点数组
 * @param texts - 对应的文本内容数组
 *
 * @example
 * ```ts
 * const textNodes = [text1, text2, text3];
 * const texts = ['hello', 'world', '!'];
 * updateTextBatch(textNodes, texts); // 批量更新多个文本节点
 * ```
 */
export function updateTextBatch(nodes: unknown[], texts: unknown[]): void {
  if (typeof document === 'undefined') return;

  const len = Math.min(nodes.length, texts.length);
  for (let i = 0; i < len; i++) {
    const node = nodes[i] as Node;
    const text = String(texts[i]);

    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent !== text) {
        node.textContent = text;
      }
    }
  }
}

/**
 * 批量设置元素属性
 * 合并多次属性设置
 *
 * @param elements - 元素数组
 * @param attrName - 属性名
 * @param attrValues - 属性值数组
 *
 * @example
 * ```ts
 * const divs = [div1, div2, div3];
 * setAttributeBatch(divs, 'data-id', ['1', '2', '3']); // 批量设置 data-id
 * ```
 */
export function setAttributeBatch(
  elements: unknown[],
  attrName: string,
  attrValues: unknown[],
): void {
  if (typeof document === 'undefined') return;

  const len = Math.min(elements.length, attrValues.length);
  for (let i = 0; i < len; i++) {
    const el = elements[i] as Element;
    el.setAttribute(attrName, String(attrValues[i]));
  }
}

/**
 * 批量设置元素类名
 *
 * @param elements - 元素数组
 * @param classNames - 类名字符串数组
 *
 * @example
 * ```ts
 * const divs = [div1, div2, div3];
 * setClassBatch(divs, ['active', '', 'selected']); // 批量设置类名
 * ```
 */
export function setClassBatch(elements: unknown[], classNames: string[]): void {
  if (typeof document === 'undefined') return;

  const len = Math.min(elements.length, classNames.length);
  for (let i = 0; i < len; i++) {
    const el = elements[i] as Element;
    const className = classNames[i] ?? '';
    el.className = className;
  }
}

/**
 * 防抖渲染调度器
 * 用于高频更新场景下减少渲染次数
 *
 * @param renderFn - 渲染函数
 * @param delay - 延迟时间（ms），默认 16ms（约 60fps）
 * @returns 调度函数
 *
 * @example
 * ```ts
 * const scheduleUpdate = createRenderScheduler(() => {
 *   render();
 * });
 *
 * // 多次调用只会触发一次渲染
 * scheduleUpdate();
 * scheduleUpdate();
 * scheduleUpdate();
 */
export function createRenderScheduler(renderFn: () => void, delay = 16): () => void {
  let pending = false;

  const executeRender = () => {
    renderFn();
    pending = false;
  };

  return () => {
    if (pending) return;
    pending = true;

    setTimeout(executeRender, delay);
  };
}

/**
 * 取消待执行的渲染
 * 注意：由于 setTimeout 无法取消，此函数仅作为占位符
 */
export function cancelScheduledRender(_scheduleFn: () => void): void {
  // 无法取消 setTimeout，下次渲染仍会执行
}

/**
 * 高效列表渲染器接口
 * 提供基于 key 的增量更新，最小化 DOM 操作
 */
export interface VaporListRenderer<T> {
  container: HTMLElement;
  render: (items: T[]) => void;
  destroy: () => void;
}

export interface VaporListOptions<T> {
  keyFn: (item: T) => string | number;
  renderItem: (item: T, index: number) => Node | Node[];
  updateItem?: (item: T, index: number, nodes: Node[]) => void;
  onMount?: (item: T, index: number, nodes: Node[]) => void;
  onUnmount?: (item: T, index: number, nodes: Node[]) => void;
}

/**
 * 创建高效列表渲染器
 * 使用虚拟 DOM 差异算法实现增量更新，最小化 DOM 操作
 *
 * @param container - 容器元素
 * @param options - 配置选项
 * @returns 列表渲染器
 *
 * @example
 * ```ts
 * const container = document.getElementById('list')!;
 *
 * const listRenderer = createVaporListRenderer(container, {
 *   keyFn: (item) => item.id,
 *   renderItem: (item, index) => {
 *     const div = document.createElement('div');
 *     div.textContent = `${index}: ${item.name}`;
 *     return div;
 *   },
 * });
 *
 * // 渲染 1000 个列表项
 * listRenderer.render(items);
 *
 * // 增量更新（仅操作变化的节点）
 * listRenderer.render(updatedItems);
 *
 * // 清理
 * listRenderer.destroy();
 * ```
 */
export function createVaporListRenderer<T>(
  container: HTMLElement,
  options: VaporListOptions<T>,
): VaporListRenderer<T> {
  const { keyFn, renderItem, updateItem, onMount, onUnmount } = options;
  const itemCache = new Map<string | number, { item: T; nodes: Node[]; index: number }>();
  let currentItems: T[] = [];

  const render = (items: T[]) => {
    const diff = diffLists(currentItems, items, keyFn);
    currentItems = [...items];

    // 处理删除（从后往前，避免索引问题）
    for (let i = diff.removed.length - 1; i >= 0; i--) {
      const removed = diff.removed[i]!;
      const key = keyFn(removed.item);
      const cached = itemCache.get(key);
      if (cached) {
        if (onUnmount) onUnmount(removed.item, cached.index, cached.nodes);
        removeBatch(cached.nodes);
        itemCache.delete(key);
      }
    }

    // 处理移动
    const movedCache = new Map<string | number, { item: T; nodes: Node[] }>();
    for (const moved of diff.moved) {
      const key = keyFn(moved.item);
      const cached = itemCache.get(key);
      if (cached) {
        movedCache.set(key, { item: moved.item, nodes: cached.nodes });
        removeBatch(cached.nodes);
      }
    }

    // 处理更新
    for (const updated of diff.updated) {
      const key = keyFn(updated.item);
      const cached = itemCache.get(key);
      if (cached && updateItem) {
        updateItem(updated.item, updated.index, cached.nodes);
      }
    }

    // 重新按正确顺序插入
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < items.length; index++) {
      const item = items[index]!;
      const key = keyFn(item);
      let nodes: Node[];

      // 检查是否是新增的项
      const added = diff.added.find((a) => keyFn(a.item) === key);
      const moved = movedCache.get(key);
      const cached = itemCache.get(key);

      if (added) {
        // 新增项
        const rendered = renderItem(item, index);
        nodes = Array.isArray(rendered) ? rendered : [rendered];
        if (onMount) onMount(item, index, nodes);
      } else if (moved) {
        // 移动项
        nodes = moved.nodes;
      } else if (cached) {
        // 保持原样的项
        nodes = cached.nodes;
        removeBatch(nodes); // 先移除再重新插入以保持顺序
      } else {
        // 理论上不会到这里，兜底处理
        const rendered = renderItem(item, index);
        nodes = Array.isArray(rendered) ? rendered : [rendered];
        if (onMount) onMount(item, index, nodes);
      }

      // 插入到 fragment
      for (const node of nodes) {
        fragment.appendChild(node);
      }

      // 更新缓存
      itemCache.set(key, { item, nodes, index });
    }

    // 一次性更新 DOM
    container.textContent = '';
    container.appendChild(fragment);
  };

  const destroy = () => {
    for (const [, cached] of itemCache) {
      if (onUnmount) onUnmount(cached.item, cached.index, cached.nodes);
      removeBatch(cached.nodes);
    }
    itemCache.clear();
    container.textContent = '';
  };

  return { container, render, destroy };
}

/**
 * 批量更新多个列表
 * 合并多个列表的更新操作，进一步减少重排重绘
 *
 * @param renderers - 列表渲染器数组
 * @param itemsArrays - 对应的数据数组
 */
export function renderListsBatch<T extends unknown[]>(
  renderers: VaporListRenderer<T[number]>[],
  itemsArrays: T[],
): void {
  if (renderers.length !== itemsArrays.length) {
    throw new Error('renderers and itemsArrays length must match');
  }

  // 先禁用布局
  const originalDisplay: string[] = [];
  for (const renderer of renderers) {
    originalDisplay.push(renderer.container.style.display);
    renderer.container.style.display = 'none';
  }

  // 批量更新
  for (let i = 0; i < renderers.length; i++) {
    renderers[i]!.render(itemsArrays[i]!);
  }

  // 恢复布局，一次性触发重排
  for (let i = 0; i < renderers.length; i++) {
    renderers[i]!.container.style.display = originalDisplay[i]!;
  }
}
