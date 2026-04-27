/**
 * Lyt.js Vapor Mode - 响应式绑定
 *
 * 在 Vapor Mode 中，响应式信号直接绑定到 DOM 属性上，
 * 无需虚拟 DOM 中间层。当信号值变化时，直接更新对应的 DOM 节点。
 *
 * 每个绑定函数返回一个清理函数，用于在卸载时取消订阅。
 */

import type { Signal } from '@lytjs/reactivity/signal';
import { effect } from '@lytjs/reactivity/signal';

// ================================================================
//  类型定义
// ================================================================

/** DOM 元素接口（兼容真实 DOM 和 Mock DOM） */
export interface VaporElement {
  tagName: string
  nodeType: number
  textContent: string
  className: string
  childNodes: VaporElement[]
  parentNode: VaporElement | null
  style: Record<string, string> | CSSStyleDeclaration
  setAttribute(key: string, value: string): void
  removeAttribute(key: string): void
  addEventListener(event: string, handler: Function): void
  removeEventListener(event: string, handler: Function): void
  appendChild(child: VaporElement): void
  insertBefore(child: VaporElement, ref: VaporElement | null): void
  replaceChild(newChild: VaporElement, oldChild: VaporElement): VaporElement
  removeChild(child: VaporElement): void
  nextSibling: VaporElement | null
  firstChild: VaporElement | null
  innerHTML?: string
  hidden?: boolean
  value?: string
  checked?: boolean
  disabled?: boolean
  [key: string]: unknown
}

/** 绑定清理函数 */
export type BindingCleanup = () => void

// ================================================================
//  文本绑定
// ================================================================

/**
 * 将信号值绑定到元素的 textContent
 *
 * @param el    目标 DOM 元素
 * @param sig   响应式信号
 * @returns 清理函数
 */
export function bindText<T>(
  el: VaporElement,
  sig: Signal<T>
): BindingCleanup {
  const dispose = effect(() => {
    const value = sig();
    el.textContent = value === null || value === undefined ? '' : String(value);
  });
  return dispose;
}

// ================================================================
//  属性绑定
// ================================================================

/**
 * 将信号值绑定到元素的 DOM 属性（如 value, checked, disabled 等）
 *
 * @param el    目标 DOM 元素
 * @param prop  属性名
 * @param sig   响应式信号
 * @returns 清理函数
 */
export function bindProp<T>(
  el: VaporElement,
  prop: string,
  sig: Signal<T>
): BindingCleanup {
  const dispose = effect(() => {
    const value = sig()
    ;(el as Record<string, unknown>)[prop] = value;
  });
  return dispose;
}

// ================================================================
//  HTML 属性绑定
// ================================================================

/**
 * 将信号值绑定到元素的 HTML 属性（通过 setAttribute）
 *
 * @param el    目标 DOM 元素
 * @param attr  属性名
 * @param sig   响应式信号
 * @returns 清理函数
 */
export function bindAttr<T>(
  el: VaporElement,
  attr: string,
  sig: Signal<T>
): BindingCleanup {
  const dispose = effect(() => {
    const value = sig();
    if (value === null || value === undefined || value === false) {
      el.removeAttribute(attr);
    } else {
      el.setAttribute(attr, value === true ? '' : String(value));
    }
  });
  return dispose;
}

// ================================================================
//  Class 绑定
// ================================================================

/**
 * 将信号值绑定到元素的 className
 *
 * 支持三种形式：
 *   - 字符串：直接设置为 className
 *   - 对象：{ active: true, disabled: false } -> "active"
 *   - 数组：["class-a", "class-b"] -> "class-a class-b"
 *
 * @param el    目标 DOM 元素
 * @param sig   响应式信号
 * @returns 清理函数
 */
export function bindClass<T>(
  el: VaporElement,
  sig: Signal<T>
): BindingCleanup {
  const dispose = effect(() => {
    const value = sig();
    if (typeof value === 'string') {
      el.className = value;
    } else if (Array.isArray(value)) {
      el.className = value.filter(Boolean).join(' ');
    } else if (typeof value === 'object' && value !== null) {
      const classes: string[] = [];
      const obj = value as Record<string, unknown>;
      for (const key of Object.keys(obj)) {
        if (obj[key]) {
          classes.push(key);
        }
      }
      el.className = classes.join(' ');
    } else {
      el.className = '';
    }
  });
  return dispose;
}

// ================================================================
//  事件绑定
// ================================================================

/**
 * 将事件处理器绑定到元素
 *
 * @param el      目标 DOM 元素
 * @param event   事件名
 * @param handler 事件处理函数
 * @returns 清理函数
 */
export function bindEvent(
  el: VaporElement,
  event: string,
  handler: Function
): BindingCleanup {
  el.addEventListener(event, handler);
  return () => {
    el.removeEventListener(event, handler);
  };
}

// ================================================================
//  样式绑定
// ================================================================

/**
 * 将信号值绑定到元素的 style 属性
 *
 * 支持两种形式：
 *   - 字符串：直接设置为 style.cssText
 *   - 对象：{ color: 'red', fontSize: '14px' } -> 逐项设置
 *
 * @param el    目标 DOM 元素
 * @param sig   响应式信号
 * @returns 清理函数
 */
export function bindStyle<T>(
  el: VaporElement,
  sig: Signal<T>
): BindingCleanup {
  const dispose = effect(() => {
    const value = sig();
    if (typeof value === 'string') {
      (el as Record<string, unknown>).style = value;
    } else if (typeof value === 'object' && value !== null) {
      const styleObj = el.style as Record<string, string>;
      // 先清空所有样式
      for (const key of Object.keys(styleObj)) {
        styleObj[key] = '';
      }
      // 设置新样式
      for (const [key, val] of Object.entries(value as Record<string, string>)) {
        styleObj[key] = val;
      }
    } else {
      (el as Record<string, unknown>).style = '';
    }
  });
  return dispose;
}

// ================================================================
//  HTML 绑定
// ================================================================

/**
 * 将信号值绑定到元素的 innerHTML
 *
 * ⚠️ 注意：使用 innerHTML 存在 XSS 风险，请确保数据来源可信。
 *
 * @param el    目标 DOM 元素
 * @param sig   响应式信号
 * @returns 清理函数
 */
export function bindHTML<T>(
  el: VaporElement,
  sig: Signal<T>
): BindingCleanup {
  // 安全提示: 仅对可信内容使用 innerHTML，用户输入应使用 textContent
  const dispose = effect(() => {
    const value = sig();
    const str = value === null || value === undefined ? '' : String(value);
    if (el.innerHTML !== str) {
      el.innerHTML = str;
    }
  });
  return dispose;
}

// ================================================================
//  条件渲染绑定
// ================================================================

/**
 * 根据信号值控制元素的插入/移除
 *
 * 当信号值为真值时插入元素到 DOM，假值时从 DOM 移除。
 * 使用注释节点作为锚点，保持 DOM 位置稳定。
 *
 * @param el        目标 DOM 元素
 * @param sig       响应式信号
 * @param anchor    可选的锚点元素，用于定位插入位置
 * @returns 清理函数
 */
export function bindIf<T>(
  el: VaporElement,
  sig: Signal<T>,
  anchor?: VaporElement
): BindingCleanup {
  let inserted = el.parentNode !== null;
  // 如果没有提供 anchor，在元素前插入一个注释节点作为锚点
  let anchorNode: VaporElement | null = anchor || null;
  if (!anchorNode && el.parentNode) {
    // 元素已在 DOM 中，在它前面插入锚点
    anchorNode = el.parentNode as unknown as VaporElement;
  }

  const dispose = effect(() => {
    const value = sig();
    if (value) {
      if (!inserted) {
        // 插入元素到锚点位置
        if (anchorNode && anchorNode.parentNode) {
          anchorNode.parentNode.insertBefore(el, anchorNode.nextSibling);
        } else if (anchorNode) {
          anchorNode.appendChild(el);
        }
        inserted = true;
      }
    } else {
      if (inserted && el.parentNode) {
        el.parentNode.removeChild(el);
        inserted = false;
      }
    }
  });

  return () => {
    dispose();
    if (inserted && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  };
}

// ================================================================
//  列表渲染绑定
// ================================================================

/**
 * 根据信号数组渲染列表
 *
 * 当数组变化时，智能 diff 并更新 DOM。
 * 使用 key 进行高效的增删改操作。
 *
 * @param container   容器元素
 * @param sig         响应式信号（返回数组）
 * @param renderItem  渲染单项的函数，接收 (item, index) 返回 VaporElement
 * @param keyFn       可选的 key 提取函数，用于高效 diff
 * @returns 清理函数
 */
export function bindEach<T>(
  container: VaporElement,
  sig: Signal<T[]>,
  renderItem: (item: T, index: number) => VaporElement,
  keyFn?: (item: T, index: number) => string | number
): BindingCleanup {
  // 当前渲染的元素和 key 映射
  let currentElements: VaporElement[] = [];
  let currentKeys: (string | number)[] = [];
  const elementByKey = new Map<string | number, VaporElement>();

  const dispose = effect(() => {
    const items = sig();
    if (!Array.isArray(items)) return;

    const newKeys = items.map((item, i) =>
      keyFn ? keyFn(item, i) : i
    );

    // 快速路径：长度相同且所有 key 相同 -> 原地更新
    if (newKeys.length === currentKeys.length) {
      let allSame = true;
      for (let i = 0; i < newKeys.length; i++) {
        if (newKeys[i] !== currentKeys[i]) {
          allSame = false;
          break;
        }
      }
      if (allSame) {
        // 原地更新
        for (let i = 0; i < items.length; i++) {
          const newEl = renderItem(items[i], i);
          const oldEl = currentElements[i];
          if (oldEl && oldEl.parentNode === container) {
            container.replaceChild(newEl, oldEl);
          }
          currentElements[i] = newEl;
          elementByKey.set(newKeys[i], newEl);
        }
        return;
      }
    }

    // Keyed diff 算法
    const oldKeySet = new Set(currentKeys);
    const newKeySet = new Set(newKeys);
    const newElementByKey = new Map<string | number, VaporElement>();

    // 1. 创建新元素
    for (let i = 0; i < items.length; i++) {
      const key = newKeys[i];
      if (oldKeySet.has(key) && elementByKey.has(key)) {
        // 复用已有元素
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const existingEl = elementByKey.get(key)!;
        newElementByKey.set(key, existingEl);
        elementByKey.delete(key);
      } else {
        // 创建新元素
        const el = renderItem(items[i], i);
        newElementByKey.set(key, el);
      }
    }

    // 2. 移除不再存在的旧元素
    for (const [key, el] of elementByKey) {
      if (!newKeySet.has(key) && el.parentNode === container) {
        container.removeChild(el);
      }
    }

    // 3. 按新顺序重新排列
    // 先清除容器中所有当前元素
    for (const el of currentElements) {
      if (el.parentNode === container) {
        container.removeChild(el);
      }
    }

    // 按新顺序插入
    currentElements = [];
    currentKeys = [];
    for (let i = 0; i < items.length; i++) {
      const key = newKeys[i];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const el = newElementByKey.get(key)!;
      container.appendChild(el);
      currentElements.push(el);
      currentKeys.push(key);
    }

    // 更新 elementByKey
    elementByKey.clear();
    for (const [key, el] of newElementByKey) {
      elementByKey.set(key, el);
    }
  });

  return () => {
    dispose();
    for (const el of currentElements) {
      if (el.parentNode === container) {
        container.removeChild(el);
      }
    }
    currentElements = [];
    currentKeys = [];
    elementByKey.clear();
  };
}
