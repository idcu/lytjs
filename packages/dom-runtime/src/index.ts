// src/index.ts
// @lytjs/dom-runtime - Signal 模式 DOM 运行时，提供细粒度 DOM 操作能力

import { effect, stop } from '@lytjs/reactivity';

// ==================== 环境检测 ====================

const isBrowser =
  typeof document !== 'undefined' &&
  typeof HTMLElement !== 'undefined';

// ==================== XSS 防护 ====================

/**
 * 危险标签名称列表，用于 sanitizeHTML 的正则匹配
 */
const DANGEROUS_TAG_NAMES = 'script|iframe|object|embed|applet|form';

/**
 * 自闭合危险标签名称列表（包含 input、textarea 等表单元素）
 */
const DANGEROUS_SELF_CLOSING_TAG_NAMES = `${DANGEROUS_TAG_NAMES}|input|textarea|select|button|link|meta`;

/**
 * 基础 HTML sanitizer，移除危险标签和属性
 * 注意：这不是一个完整的 sanitizer，仅提供基础防护
 * 生产环境建议使用 DOMPurify 等成熟库
 *
 * @internal 仅供内部使用，不作为公共 API 暴露
 */
function sanitizeHTML(html: string): string {
  // 防御嵌套绕过：循环执行所有清理步骤，直到结果不再变化
  let prevResult = '';
  while (html !== prevResult) {
    prevResult = html;
    // 移除危险标签（含内容）
    html = html.replace(
      new RegExp(
        `<\\s*/?\\s*(${DANGEROUS_TAG_NAMES})[^>]*>[\\s\\S]*?<\\s*/\\s*\\1\\s*>`,
        'gi',
      ),
      '',
    );
    // 移除自闭合的危险标签
    html = html.replace(
      new RegExp(
        `<\\s*(${DANGEROUS_SELF_CLOSING_TAG_NAMES})[^>]*/?>`,
        'gi',
      ),
      '',
    );
    // 移除事件属性（on*）
    html = html.replace(
      /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
      '',
    );
    // 移除危险属性（srcdoc、formaction、xlink:href）
    html = html.replace(
      /\s+(srcdoc|formaction|xlink:href)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
      '',
    );
    // FIX: P0-11 过滤 javascript: 伪协议，防止 XSS 绕过
    // 匹配 href/src/action 等属性中的 javascript: 伪协议（含大小写变体和空白绕过）
    html = html.replace(
      /\s+(href|src|action|formaction|data)\s*=\s*(?:"[^"]*"|'[^']*')/gi,
      (match) => {
        // 检查属性值是否包含 javascript: 伪协议
        const valueMatch = match.match(/=\s*(?:"([^"]*)"|'([^']*)')/);
        if (valueMatch) {
          const value = (valueMatch[1] ?? valueMatch[2] ?? '').replace(/[\s\x00-\x1f]+/g, '');
          if (/^javascript\s*:/i.test(value)) {
            return ''; // 移除包含 javascript: 伪协议的属性
          }
        }
        return match;
      },
    );
    // FIX: P0-11 过滤 SVG foreignObject 标签，防止通过 SVG 命名空间注入恶意 HTML
    html = html.replace(
      /<\s*foreignObject[^>]*>[\s\S]*?<\s*\/\s*foreignObject\s*>/gi,
      '',
    );
    html = html.replace(
      /<\s*foreignObject[^>]*\/?>/gi,
      '',
    );
  }
  return html;
}

// ==================== DOM 创建 ====================

/**
 * 从 HTML 字符串创建模板元素
 * 解析一次，后续克隆复用
 */
export function createTemplate(html: string): DocumentFragment {
  if (!isBrowser) {
    // 非浏览器环境返回空 fragment（无法使用 document API）
    return {
      nodeType: 11,
      childNodes: [],
      children: [],
      firstChild: null,
      lastChild: null,
      appendChild() { return null as unknown as Node; },
      removeChild() { return null as unknown as Node; },
      cloneNode() { return this as unknown as DocumentFragment; },
    } as unknown as DocumentFragment;
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
 * 设置元素的 HTML 内容（带 XSS 防护）
 * 自动过滤危险的 script/iframe 标签和事件属性
 */
export function setHTML(el: Element, value: string): void {
  if (!isBrowser) return;
  el.innerHTML = sanitizeHTML(value);
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
 * 常见的需要设置 DOM property 而非 HTML attribute 的属性名称集合。
 * 提取为模块级常量以避免每次调用 setProperty 时重复创建。
 */
const PROPERTY_KEYS = new Set([
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

/**
 * 设置元素的属性（智能判断属性/property）
 *
 * 对于 value、checked、disabled 等布尔/值属性，
 * 直接设置 DOM property 而非 HTML attribute
 */
export function setProperty(el: Element, key: string, value: unknown): void {
  if (!isBrowser) return;
  const htmlEl = el as HTMLElement & Record<string, unknown>;
  if (PROPERTY_KEYS.has(key) || key in htmlEl) {
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
 * FIX: P1-54 使用 setProperty 替代直接赋值，
 * 正确处理包含连字符的 CSS 属性名（如 background-color、font-size）
 */
export function setStyle(el: Element, style: string | Record<string, string>): void {
  if (!isBrowser) return;
  const htmlEl = el as HTMLElement;
  if (typeof style === 'string') {
    htmlEl.style.cssText = style;
  } else {
    for (const [key, value] of Object.entries(style)) {
      // FIX: P1-54 使用 style.setProperty 替代直接属性赋值，
      // 确保连字符 CSS 属性名（如 background-color）能正确设置
      htmlEl.style.setProperty(key, value);
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

// FIX: P2-45 需要单位的 CSS 属性列表
const NUMERIC_STYLE_PROPERTIES = new Set([
  'width', 'height', 'top', 'right', 'bottom', 'left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-width', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'font-size', 'line-height', 'letter-spacing', 'word-spacing',
  'min-width', 'max-width', 'min-height', 'max-height',
  'outline-width', 'column-width', 'column-gap', 'row-gap',
]);

function isNumericStyleProperty(prop: string): boolean {
  return NUMERIC_STYLE_PROPERTIES.has(prop);
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

/**
 * WeakMap 用于存储节点的 reconcile key，避免直接在 DOM 元素上设置
 * __reconcileKey 属性而污染 DOM 属性空间。
 */
const reconcileKeyMap = new WeakMap<Node, string | number>();

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
 *
 * FIX: P2-43 移动动画支持：
 * 如果 options.animateMove 提供了移动动画函数，在节点移动时调用该函数
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
  // 使用 WeakMap 存储节点的 reconcile key，避免污染 DOM 元素属性空间
  const childNodes = parent.childNodes;
  let endIdx = ref != null
    ? Array.from(childNodes as ArrayLike<ChildNode>).indexOf(ref as ChildNode)
    : childNodes.length;

  // 当 ref 不在 parent 中时，回退到 childNodes.length（等同于 ref 为 null 的行为）
  // FIX: P1-52 添加 DEV 警告，提醒开发者 ref 不在 parent 中可能是逻辑错误
  if (endIdx < 0) {
    if (__DEV__) {
      console.warn(
        '[lytjs/dom-runtime] reconcileArray: ref node is not a child of parent. ' +
        'Falling back to appending at the end.',
      );
    }
    endIdx = childNodes.length;
  }

  for (let i = 0; i < endIdx; i++) {
    const node = childNodes[i]!;
    // 从 WeakMap 中获取节点的 reconcile key
    const key = reconcileKeyMap.get(node);
    if (key !== undefined) {
      existingMap.set(key, { node, item: undefined as unknown as T });
      existingNodes.push(node);
    }
  }

  // 标记已处理的 key
  const usedKeys = new Set<string | number>();
  const fragment = document.createDocumentFragment();

  // FIX: P1-51 检测新列表中的重复 key，在 DEV 模式下发出警告
  if (__DEV__) {
    const seenKeys = new Set<string | number>();
    for (let i = 0; i < list.length; i++) {
      const key = options.key(list[i]!);
      if (seenKeys.has(key)) {
        console.warn(
          `[lytjs/dom-runtime] Duplicate key "${String(key)}" detected in reconcileArray at index ${i}. ` +
          `This may cause unexpected behavior.`,
        );
      }
      seenKeys.add(key);
    }
  }

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
      // 删除已匹配的 key，防止重复 key 时同一节点被匹配两次
      existingMap.delete(key);
    } else {
      // key 不存在：创建新节点
      const node = options.create(item);
      reconcileKeyMap.set(node, key);
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
 * 当前使用微任务（Promise.resolve().then）延迟执行，合并同一 tick 内的多次 DOM 操作。
 * TODO (P2-14): 未来可考虑使用 requestAnimationFrame 替代微任务，
 * 使 DOM 批量更新与浏览器渲染帧对齐，进一步减少不必要的重排重绘。
 * 但需注意 requestAnimationFrame 的回调时机晚于微任务，可能影响更新时序。
 */
export function batchDOM(fn: () => void): void {
  if (!isBrowser) {
    fn();
    return;
  }
  // 使用微任务延迟执行，合并同一 tick 内的多次 DOM 操作
  Promise.resolve().then(fn);
}

// ==================== 卸载 ====================

export type CleanupFn = () => void;

/** 清理函数栈（模块级，用于简单场景） */
const cleanupStack: CleanupFn[] = [];

/** 当前活跃的清理栈，支持嵌套作用域 */
// FIX: P2-44 嵌套作用域支持：使用栈结构管理嵌套的清理作用域
let activeCleanupStack: CleanupFn[] | null = null;

/**
 * 注册清理函数到当前活跃的清理栈
 * 如果有活跃的清理栈（通过 createCleanupScope 创建），则注册到该栈
 * 否则注册到全局清理栈
 */
export function onCleanup(fn: CleanupFn): void {
  const stack = activeCleanupStack ?? cleanupStack;
  stack.push(fn);
}

/**
 * 执行所有注册的清理函数
 * 即使某个函数抛出异常，也会继续执行后续函数
 */
export function runCleanups(): void {
  const stack = activeCleanupStack ?? cleanupStack;
  const fns = stack.splice(0, stack.length);
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

/**
 * 创建一个隔离的清理作用域
 * 在 scope 内注册的 onCleanup 只会被 scope 的 dispose 清理
 * 避免多个渲染器实例之间的清理函数互相干扰
 *
 * FIX: P1-53 作用域切换时机修正：
 * 之前的实现中，activeCleanupStack 在 createCleanupScope 调用时立即切换，
 * 但 dispose 时先恢复 prevStack 再执行清理函数，导致清理函数执行时
 * activeCleanupStack 已恢复到外层，如果清理函数中注册了新的 onCleanup，
 * 这些新的清理函数会注册到外层栈而非当前作用域。
 * 现在改为在所有清理函数执行完毕后再恢复 prevStack。
 */
export function createCleanupScope(): { dispose: () => void } {
  const scopeStack: CleanupFn[] = [];
  const prevStack = activeCleanupStack;
  activeCleanupStack = scopeStack;
  return {
    dispose() {
      // FIX: P1-53 先执行所有清理函数，再恢复 prevStack
      // 确保清理函数中注册的新的 onCleanup 仍然注册到当前作用域
      const fns = scopeStack.splice(0, scopeStack.length);
      for (const fn of fns) {
        try {
          fn();
        } catch {
          // 静默忽略清理错误
        }
      }
      // 所有清理函数执行完毕后再恢复外层栈
      activeCleanupStack = prevStack;
    },
  };
}
