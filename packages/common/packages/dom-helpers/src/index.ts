/**
 * @lytjs/common-dom-helpers
 * 轻量级 DOM 操作辅助工具
 */

const isBrowser =
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  typeof document.createElement === 'function';

/** 危险的事件属性黑名单，防止通过属性注入事件处理器 */
const DANGEROUS_EVENT_ATTRS = new Set([
  'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover',
  'onmousemove', 'onmouseout', 'onmouseenter', 'onmouseleave',
  'onkeydown', 'onkeyup', 'onkeypress',
  'onfocus', 'onblur', 'oninput', 'onchange', 'onsubmit', 'onreset',
  'onload', 'onunload', 'onbeforeunload', 'onerror', 'onresize',
  'onscroll', 'onwheel', 'ondrag', 'ondragstart', 'ondragend',
  'ondragenter', 'ondragleave', 'ondragover', 'ondrop',
  'oncopy', 'oncut', 'onpaste',
  'oncontextmenu', 'onselect', 'onselectstart',
  'ontouchstart', 'ontouchend', 'ontouchmove', 'ontouchcancel',
  'onpointerdown', 'onpointerup', 'onpointermove',
  'onanimationstart', 'onanimationend', 'onanimationiteration',
  'ontransitionend', 'ontransitionstart', 'ontransitionend',
  'ontransitioncancel',
]);

/**
 * 检查属性名是否安全（非事件处理器）
 */
function isSafeAttr(key: string): boolean {
  return !DANGEROUS_EVENT_ATTRS.has(key.toLowerCase());
}

/**
 * 创建 DOM 元素
 *
 * @param tag - 标签名
 * @param attrs - 属性对象（可选）
 * @param children - 子元素列表，字符串会创建 TextNode（可选）
 * @returns 创建的 Element
 */
export function createElement(
  tag: string,
  attrs?: Record<string, string>,
  children?: (string | Node)[],
): Element {
  if (!isBrowser) {
    throw new Error('createElement is only available in browser environments');
  }

  const el = document.createElement(tag);

  if (attrs) {
    for (const key of Object.keys(attrs)) {
      const val = attrs[key];
      if (val !== undefined && isSafeAttr(key)) {
        el.setAttribute(key, val);
      }
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
 * 在参考节点前插入子节点
 *
 * @param parent - 父节点
 * @param child - 要插入的子节点
 * @param ref - 参考节点，为 null 时等同于 appendChild
 */
export function insertBefore(
  parent: Node,
  child: Node,
  ref: Node | null,
): void {
  if (!isBrowser) {
    throw new Error('insertBefore is only available in browser environments');
  }

  parent.insertBefore(child, ref);
}

/**
 * 移除子节点
 *
 * @param parent - 父节点
 * @param child - 要移除的子节点
 * @returns 成功返回 true，失败返回 false
 */
export function removeChild(parent: Node, child: Node): boolean {
  if (!isBrowser) {
    return false;
  }

  try {
    parent.removeChild(child);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取下一个兄弟节点
 *
 * @param node - 当前节点
 * @param skipComments - 是否跳过注释节点，默认为 false
 * @returns 下一个兄弟节点，如果没有则返回 null
 */
export function nextSibling(node: Node, skipComments: boolean = false): Node | null {
  if (!isBrowser) {
    return null;
  }

  let sibling = node.nextSibling;
  if (skipComments) {
    while (sibling && sibling.nodeType === Node.COMMENT_NODE) {
      sibling = sibling.nextSibling;
    }
  }
  return sibling;
}

/**
 * 创建文本节点
 *
 * @param text - 文本内容
 * @returns Text 节点
 */
export function createTextNode(text: string): Text {
  if (!isBrowser) {
    throw new Error('createTextNode is only available in browser environments');
  }

  return document.createTextNode(text);
}

/**
 * 创建注释节点
 *
 * @param text - 注释内容
 * @returns Comment 节点
 */
export function createComment(text: string): Comment {
  if (!isBrowser) {
    throw new Error('createComment is only available in browser environments');
  }

  return document.createComment(text);
}

/**
 * 批量设置元素样式
 *
 * @param el - 目标元素
 * @param styles - 样式键值对
 */
export function setStyle(
  el: Element,
  styles: Record<string, string | number>,
): void {
  if (!isBrowser) {
    throw new Error('setStyle is only available in browser environments');
  }

  const htmlEl = el as HTMLElement;
  for (const key of Object.keys(styles)) {
    (htmlEl.style as unknown as Record<string, string>)[key] = String(styles[key]);
  }
}

/**
 * 检查元素是否有指定 class
 *
 * @param el - 目标元素
 * @param cls - class 名称
 * @returns 是否包含该 class
 */
export function hasClass(el: Element, cls: string): boolean {
  if (!isBrowser) {
    return false;
  }

  return el.classList.contains(cls);
}

/**
 * 添加 class
 *
 * @param el - 目标元素
 * @param cls - 要添加的 class 名称列表
 */
export function addClass(el: Element, ...cls: string[]): void {
  if (!isBrowser) {
    return;
  }

  el.classList.add(...cls);
}

/**
 * 移除 class
 *
 * @param el - 目标元素
 * @param cls - 要移除的 class 名称列表
 */
export function removeClass(el: Element, ...cls: string[]): void {
  if (!isBrowser) {
    return;
  }

  el.classList.remove(...cls);
}
