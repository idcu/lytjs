/**
 * @lytjs/adapter-web - WebRendererHost
 * 浏览器 DOM 平台的 RendererHost<Node, Element> 实现。
 *
 * 所有 DOM API 调用集中在此文件内，不泄漏到 L1/L2。
 * 极度轻薄：只做纯翻译，不做队列/兼容/归一化。
 */

import type {
  RendererHost,
  HostRect,
  HostStyleDeclaration,
  TransitionDurationInfo,
  HostEventHandler,
  HostEventOptions,
} from '@lytjs/host-contract';
import { SVG_NS, isSVGTag } from '@lytjs/common-dom';
import { patchProp } from './web-patch-props';
import { wrapDOMEvent } from './web-event-wrap';

// ============================================================
// WebRendererHost
// ============================================================

/**
 * Web 平台渲染宿主实现。
 *
 * 实现 RendererHost<Node, Element> 接口，将所有操作直接翻译为浏览器 DOM API。
 */
export class WebRendererHost implements RendererHost<Node, Element> {

  // ==========================================================
  // 一、节点操作 (Node Operations)
  // ==========================================================

  /**
   * 创建元素节点。
   * SVG 标签使用 createElementNS，普通标签使用 createElement。
   */
  createElement(tag: string, isSVG?: boolean): Element {
    if (isSVG === true || isSVGTag(tag)) {
      return document.createElementNS(SVG_NS, tag);
    }
    return document.createElement(tag);
  }

  /** 创建文本节点 */
  createText(text: string): Node {
    return document.createTextNode(text);
  }

  /** 创建注释节点 */
  createComment(text: string): Node {
    return document.createComment(text);
  }

  /** 设置元素文本内容（覆盖所有子节点） */
  setElementText(node: Element, text: string): void {
    node.textContent = text;
  }

  /** 设置文本/注释节点的内容 */
  setText(node: Node, text: string): void {
    node.nodeValue = text;
  }

  /**
   * 在父节点的 anchor 前插入子节点。
   * anchor 为 null 时追加到末尾。
   */
  insert(child: Node, parent: Node, anchor?: Node | null): void {
    parent.insertBefore(child, anchor ?? null);
  }

  /** 从父节点移除子节点 */
  remove(child: Node): void {
    const parent = child.parentNode;
    if (parent) {
      parent.removeChild(child);
    }
  }

  /** 获取下一个兄弟节点 */
  nextSibling(node: Node): Node | null {
    return node.nextSibling;
  }

  /** 获取父节点 */
  parentNode(node: Node): Node | null {
    return node.parentNode;
  }

  /**
   * 查询选择器。
   */
  querySelector(selector: string): Element | null {
    return document.querySelector(selector);
  }

  // ==========================================================
  // 二、属性操作 (Property Operations)
  // ==========================================================

  /**
   * 统一属性 patch 入口。
   * 委托给 web-patch-props.ts 处理 class/style/event/attr 分发。
   */
  patchProp(
    el: Element,
    key: string,
    prevValue: unknown,
    nextValue: unknown,
    isSVG?: boolean,
  ): void {
    patchProp(el, key, prevValue, nextValue, isSVG);
  }

  // ==========================================================
  // 三、样式操作 (Style Operations)
  // ==========================================================

  /** 添加 CSS 类名 */
  addClass(el: Element, cls: string): void {
    el.classList.add(cls);
  }

  /** 移除 CSS 类名 */
  removeClass(el: Element, cls: string): void {
    el.classList.remove(cls);
  }

  /** 检查是否包含 CSS 类名 */
  hasClass(el: Element, cls: string): boolean {
    return el.classList.contains(cls);
  }

  /**
   * 设置内联样式属性。
   * value 为 null/undefined 时移除该样式属性。
   */
  setStyle(el: Element, key: string, value: string | null | undefined): void {
    const style = (el as HTMLElement).style;
    if (value == null) {
      style.removeProperty(key);
    } else {
      style.setProperty(key, value);
    }
  }

  /** 移除内联样式属性 */
  removeStyle(el: Element, key: string): void {
    (el as HTMLElement).style.removeProperty(key);
  }

  /**
   * 获取计算样式。
   */
  getComputedStyle(el: Element): HostStyleDeclaration {
    const computed = window.getComputedStyle(el);
    return {
      getPropertyValue(prop: string): string {
        return computed.getPropertyValue(prop);
      },
    };
  }

  /**
   * 强制回流/重排。
   * 读取 offsetHeight 触发浏览器同步布局。
   */
  forceReflow(el: Element): void {
    void (el as HTMLElement).offsetHeight;
  }

  // ==========================================================
  // 四、事件操作 (Event Operations)
  // ==========================================================

  /**
   * 添加事件监听器。
   * 将原生 DOM Event 包装为 HostEvent 后传递给 handler。
   * 返回一个取消监听的函数。
   */
  addEventListener(
    el: Element,
    event: string,
    handler: HostEventHandler,
    options?: HostEventOptions,
  ): () => void {
    const wrappedHandler = (e: Event) => {
      handler(wrapDOMEvent(e));
    };
    el.addEventListener(event, wrappedHandler, options as AddEventListenerOptions | undefined);
    return () => {
      el.removeEventListener(event, wrappedHandler, options as AddEventListenerOptions | undefined);
    };
  }

  /**
   * 移除事件监听器。
   */
  removeEventListener(
    el: Element,
    event: string,
    handler: HostEventHandler,
    options?: HostEventOptions,
  ): void {
    // 注意：由于 addEventListener 包装了 handler，直接移除无法匹配。
    // 此方法用于外部直接调用场景，实际事件管理通过 invoker 模式处理。
    el.removeEventListener(
      event,
      handler as unknown as EventListener,
      options as AddEventListenerOptions | undefined,
    );
  }

  // ==========================================================
  // 五、过渡动画 (Transition Operations)
  // ==========================================================

  /**
   * 获取元素的几何边界信息。
   */
  getBoundingClientRect(el: Element): HostRect {
    const rect = el.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
    };
  }

  /** 获取元素的指定属性值 */
  getAttribute(el: Element, key: string): string | null {
    return el.getAttribute(key);
  }

  /**
   * 获取过渡/动画时长信息。
   * 通过读取计算样式中的 transition-duration / animation-duration 获取。
   */
  getTransitionInfo(el: Element, _type: 'enter' | 'leave'): TransitionDurationInfo {
    const computed = window.getComputedStyle(el);
    const transitionDuration = parseDuration(computed.getPropertyValue('transition-duration'));
    const animationDuration = parseDuration(computed.getPropertyValue('animation-duration'));
    const hasTransition = transitionDuration > 0;
    const hasAnimation = animationDuration > 0;
    const duration = hasTransition ? transitionDuration : animationDuration;
    return { duration, hasTransition, hasAnimation };
  }

  // ==========================================================
  // 六、时序调度 (Timing Operations)
  // ==========================================================

  /**
   * 请求下一帧回调（双 rAF 确保浏览器已绘制）。
   */
  nextFrame(fn: () => void): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(fn);
    });
  }

  /**
   * 延迟执行。
   */
  setTimeout(fn: () => void, ms: number): number {
    return window.setTimeout(fn, ms);
  }

  /** 取消延迟执行 */
  clearTimeout(id: number): void {
    window.clearTimeout(id);
  }

  // ==========================================================
  // 七、其他 (Miscellaneous)
  // ==========================================================

  /**
   * 获取元素的 namespaceURI（用于 SVG 检测）。
   */
  getNamespaceURI(el: Element): string | null {
    return el.namespaceURI;
  }

  /**
   * 替换子节点（用于 hydration mismatch 处理）。
   */
  replaceChild(parent: Node, newChild: Node, oldChild: Node): void {
    parent.replaceChild(newChild, oldChild);
  }

  /**
   * 获取子节点列表（用于 hydration）。
   */
  getChildNodes(el: Element): Node[] {
    return Array.from(el.childNodes);
  }

  /**
   * 获取节点类型（用于 hydration 判断）。
   */
  getNodeType(node: Node): number {
    return node.nodeType;
  }

  /**
   * 获取元素标签名（用于 hydration 匹配）。
   * 返回小写标签名。
   */
  getTagName(el: Element): string {
    return el.tagName.toLowerCase();
  }
}

// ============================================================
// Internal Helpers
// ============================================================

/**
 * 解析 CSS 时长字符串为毫秒数。
 * 支持格式：'0.3s', '300ms', '0s' 等。
 * 多个值（逗号分隔）时取最大值。
 */
function parseDuration(value: string): number {
  if (!value || value === '0s' || value === '0ms') return 0;
  const values = value.split(',');
  let max = 0;
  for (const v of values) {
    const trimmed = v.trim();
    if (trimmed.endsWith('ms')) {
      max = Math.max(max, parseFloat(trimmed) || 0);
    } else if (trimmed.endsWith('s')) {
      max = Math.max(max, (parseFloat(trimmed) || 0) * 1000);
    }
  }
  return max;
}
