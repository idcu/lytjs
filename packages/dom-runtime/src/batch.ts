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
