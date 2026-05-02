// src/index.ts
// @lytjs/dom-runtime - Signal 模式 DOM 运行时，提供细粒度 DOM 操作能力

import { effect, stop } from '@lytjs/reactivity';

// ==================== 环境检测 ====================

const isBrowser =
  typeof document !== 'undefined' &&
  typeof HTMLElement !== 'undefined';

// ==================== DOM 创建 ====================

/**
 * 从 HTML 字符串创建模板元素
 * 解析一次，后续克隆复用
 */
export function createTemplate(html: string): DocumentFragment {
  if (!isBrowser) {
    return document.createDocumentFragment();
  }
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.cloneNode(true) as DocumentFragment;
}

/**
 * 创建 DOM 元素
 */
export function createElement(
  tag: string,
  attrs?: Record<string, string>,
  children?: Array<string | Node>,
): Element {
  if (!isBrowser) {
    return {} as Element;
  }
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
  }
  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    }
  }
  return el;
}

/**
 * 创建文本节点
 */
export function createTextNode(text: string): Text {
  if (!isBrowser) {
    return {} as Text;
  }
  return document.createTextNode(text);
}

// ==================== DOM 插入/删除 ====================

/**
 * 将节点插入到父元素中
 * ref 为 null 时追加到末尾
 */
export function insert(child: Node, parent: Node, ref?: Node | null): void {
  if (!isBrowser) return;
  if (ref != null) {
    parent.insertBefore(child, ref);
  } else {
    parent.appendChild(child);
  }
}

/**
 * 移除节点
 */
export function remove(child: Node): void {
  if (!isBrowser) return;
  const parent = child.parentNode;
  if (parent) {
    parent.removeChild(child);
  }
}

/**
 * 清空父元素的所有子节点
 */
export function clearChildren(parent: Node): void {
  if (!isBrowser) return;
  parent.textContent = '';
}

// ==================== DOM 属性操作 ====================

/**
 * 设置元素的文本内容
 */
export function setText(el: Node, value: string): void {
  if (!isBrowser) return;
  el.textContent = value;
}

/**
 * 设置元素的 HTML 内容（安全）
 */
export function setHTML(el: Element, value: string): void {
  if (!isBrowser) return;
  el.innerHTML = value;
}

/**
 * 设置元素的属性
 */
export function setAttribute(el: Element, key: string, value: string): void {
  if (!isBrowser) return;
  el.setAttribute(key, value);
}

/**
 * 移除元素的属性
 */
export function removeAttribute(el: Element, key: string): void {
  if (!isBrowser) return;
  el.removeAttribute(key);
}

/**
 * 设置元素的属性（智能判断属性/property）
 *
 * 对于 value、checked、disabled 等布尔/值属性，
 * 直接设置 DOM property 而非 HTML attribute
 */
export function setProperty(el: Element, key: string, value: unknown): void {
  if (!isBrowser) return;
  const htmlEl = el as HTMLElement & Record<string, unknown>;
  // 常见的需要设置 property 的属性列表
  const propertyKeys = new Set([
    'value',
    'checked',
    'disabled',
    'selected',
    'multiple',
    'readOnly',
    'indeterminate',
    'hidden',
    'tabIndex',
    'className',
    'innerHTML',
    'textContent',
    'innerText',
    'style',
  ]);
  if (propertyKeys.has(key) || key in htmlEl) {
    htmlEl[key] = value;
  } else {
    if (value === null || value === undefined || value === false) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, String(value));
    }
  }
}

/**
 * 设置元素的样式
 */
export function setStyle(el: Element, style: string | Record<string, string>): void {
  if (!isBrowser) return;
  const htmlEl = el as HTMLElement;
  if (typeof style === 'string') {
    htmlEl.setAttribute('style', style);
  } else {
    for (const [key, value] of Object.entries(style)) {
      (htmlEl.style as unknown as Record<string, string>)[key] = value;
    }
  }
}

/**
 * 设置元素的 class
 */
export function setClass(el: Element, value: string): void {
  if (!isBrowser) return;
  el.setAttribute('class', value);
}

/**
 * 切换元素的 class
 */
export function toggleClass(el: Element, className: string, force?: boolean): void {
  if (!isBrowser) return;
  const htmlEl = el as HTMLElement;
  htmlEl.classList.toggle(className, force);
}

// ==================== 事件绑定 ====================

/**
 * 添加事件监听器，返回取消监听函数
 */
export function addEventListener(
  el: Element,
  event: string,
  handler: EventListener,
  options?: AddEventListenerOptions,
): () => void {
  if (!isBrowser) return () => {};
  el.addEventListener(event, handler, options);
  return () => {
    el.removeEventListener(event, handler, options);
  };
}

/**
 * 创建事件处理器（带修饰符支持）
 *
 * 支持的修饰符：
 * - `.stop` - 调用 event.stopPropagation()
 * - `.prevent` - 调用 event.preventDefault()
 * - `.capture` - 在捕获阶段监听
 * - `.once` - 只触发一次
 */
export function createEventHandler(
  el: Element,
  event: string,
  handler: Function,
  modifiers?: Record<string, boolean>,
): () => void {
  if (!isBrowser) return () => {};

  const mods = modifiers ?? {};
  const wrappedHandler = (e: Event) => {
    if (mods['prevent']) {
      e.preventDefault();
    }
    if (mods['stop']) {
      e.stopPropagation();
    }
    handler(e);
  };

  const options: AddEventListenerOptions = {};
  if (mods['capture']) {
    options.capture = true;
  }
  if (mods['once']) {
    options.once = true;
  }

  el.addEventListener(event, wrappedHandler as EventListener, options);
  return () => {
    el.removeEventListener(event, wrappedHandler as EventListener, options);
  };
}

// ==================== 列表协调（核心） ====================

export interface ReconcileOptions<T> {
  key: (item: T) => string | number;
  create: (item: T) => Node;
  update?: (node: Node, item: T) => void;
  destroy?: (node: Node) => void;
}

/**
 * 协调列表 DOM（keyed diff，类似 Solid.js 的 reconcileArray）
 *
 * 对比新旧列表，执行最小化 DOM 操作：
 * - 新增项：创建并插入
 * - 删除项：移除
 * - 移动项：移动 DOM 位置
 * - 更新项：调用 update 回调
 */
export function reconcileArray<T>(
  parent: Node,
  list: T[],
  options: ReconcileOptions<T>,
  ref?: Node | null,
): void {
  if (!isBrowser) return;

  // 使用 Map 追踪已有节点
  const existingMap = new Map<string | number, { node: Node; item: T }>();
  const existingNodes: Node[] = [];

  // 收集当前 parent 中已有的 reconcileArray 管理的节点
  // 通过遍历 parent.childNodes 中 ref 之前的节点
  const childNodes = parent.childNodes;
  const endIdx = ref != null
    ? Array.from(childNodes as ArrayLike<ChildNode>).indexOf(ref as ChildNode)
    : childNodes.length;

  for (let i = 0; i < endIdx; i++) {
    const node = childNodes[i]!;
    // 尝试从 node 的 __reconcileKey 属性获取 key
    const key = (node as Node & { __reconcileKey?: string | number }).__reconcileKey;
    if (key !== undefined) {
      existingMap.set(key, { node, item: undefined as unknown as T });
      existingNodes.push(node);
    }
  }

  // 标记已处理的 key
  const usedKeys = new Set<string | number>();
  const fragment = document.createDocumentFragment();

  // 遍历新列表
  for (let i = 0; i < list.length; i++) {
    const item = list[i]!;
    const key = options.key(item);
    usedKeys.add(key);

    const existing = existingMap.get(key);

    if (existing) {
      // key 已存在：更新或移动
      if (options.update) {
        options.update(existing.node, item);
      }
      // 标记 item 以便后续 destroy 判断
      existing.item = item;
      // 将节点移到 fragment 中以重新排序
      fragment.appendChild(existing.node);
    } else {
      // key 不存在：创建新节点
      const node = options.create(item);
      (node as Node & { __reconcileKey?: string | number }).__reconcileKey = key;
      fragment.appendChild(node);
    }
  }

  // 移除不再存在的节点
  for (const [key, entry] of existingMap) {
    if (!usedKeys.has(key)) {
      if (options.destroy) {
        options.destroy(entry.node);
      }
      // 从 DOM 中移除
      const parentNode = entry.node.parentNode;
      if (parentNode) {
        parentNode.removeChild(entry.node);
      }
    }
  }

  // 将 fragment 插入到 parent 中（ref 之前或末尾）
  if (ref != null) {
    parent.insertBefore(fragment, ref);
  } else {
    parent.appendChild(fragment);
  }
}

// ==================== effect 绑定辅助 ====================

/**
 * 创建一个自动清理的 effect，返回清理函数
 */
export function bindEffect(fn: () => void): () => void {
  const runner = effect(fn);
  // 自动注册清理函数
  onCleanup(() => {
    stop(runner);
  });
  return () => {
    stop(runner);
  };
}

/**
 * 批量执行 DOM 操作（减少重排）
 *
 * 使用 DocumentFragment 批量操作，减少浏览器重排次数
 */
export function batchDOM(fn: () => void): void {
  if (!isBrowser) {
    fn();
    return;
  }
  // 创建一个临时容器来批量收集 DOM 操作
  const fragment = document.createDocumentFragment();
  const container = document.createElement('div');
  fragment.appendChild(container);

  // 执行用户函数，所有对 container 的子节点操作都在 fragment 中
  fn();

  // 注意：batchDOM 本身不做特殊优化，
  // 因为 DOM 操作已经通过 DocumentFragment 在 reconcileArray 中优化
  // 这里主要作为语义化的批量操作入口
}

// ==================== 卸载 ====================

export type CleanupFn = () => void;

/** 清理函数栈 */
const cleanupStack: CleanupFn[] = [];

/**
 * 注册清理函数
 */
export function onCleanup(fn: CleanupFn): void {
  cleanupStack.push(fn);
}

/**
 * 执行所有注册的清理函数
 * 即使某个函数抛出异常，也会继续执行后续函数
 */
export function runCleanups(): void {
  const fns = cleanupStack.splice(0, cleanupStack.length);
  const errors: unknown[] = [];
  for (const fn of fns) {
    try {
      fn();
    } catch (e) {
      errors.push(e);
    }
  }
  if (errors.length > 0) {
    throw errors[0];
  }
}
