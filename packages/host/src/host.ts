/**
 * @lytjs/host - 宿主接口扩展
 *
 * 扩展 RendererHost 接口，添加更多宿主能力支持
 *
 * @module @lytjs/host
 * @version 6.0.0
 */

import type {
  RendererHost,
  HostRect,
  HostStyleDeclaration,
  HostEvent,
  HostEventHandler,
  HostEventOptions,
  TransitionDurationInfo,
} from '@lytjs/host-contract';

// 重新导出 host-contract 的类型
export type {
  RendererHost,
  HostRect,
  HostStyleDeclaration,
  HostEvent,
  HostEventHandler,
  HostEventOptions,
  TransitionDurationInfo,
} from '@lytjs/host-contract';

// ============================================================
// 扩展的 RendererHost 接口
// ============================================================

/**
 * 扩展的 RendererHost 接口
 * 在基础 RendererHost 上添加了更多宿主操作方法
 */
export interface ExtendedRendererHost<HN = unknown, HE extends HN = HN>
  extends RendererHost<HN, HE> {
  // ==========================================================
  // 扩展的节点操作
  // ==========================================================

  /**
   * 在父节点的指定子节点之前插入新子节点
   * 如果 referenceNode 为 null，则在末尾追加
   *
   * @param parent - 父节点
   * @param newChild - 要插入的新子节点
   * @param referenceNode - 参考子节点，新节点将插入其之前
   *
   * @example
   * ```ts
   * // 在 child2 之前插入 newChild
   * host.insertBefore(parent, newChild, child2)
   * // parent 的子节点顺序: [child1, newChild, child2, child3]
   * ```
   */
  insertBefore(parent: HN, newChild: HN, referenceNode: HN | null): void;

  /**
   * 替换父节点中的子节点
   *
   * @param parent - 父节点
   * @param newChild - 新子节点
   * @param oldChild - 要被替换的旧子节点
   * @returns 被替换的旧子节点
   *
   * @example
   * ```ts
   * // 用 newChild 替换 oldChild
   * host.replaceChild(parent, newChild, oldChild)
   * ```
   */
  replaceChild(parent: HN, newChild: HN, oldChild: HN): HN;

  /**
   * 获取元素的第一个子节点
   *
   * @param node - 宿主节点
   * @returns 第一个子节点，如果没有则返回 null
   */
  firstChild?(node: HN): HN | null;

  /**
   * 获取元素的最后一个子节点
   *
   * @param node - 宿主节点
   * @returns 最后一个子节点，如果没有则返回 null
   */
  lastChild?(node: HN): HN | null;

  /**
   * 检查一个节点是否包含另一个节点
   *
   * @param parent - 父节点
   * @param child - 子节点
   * @returns 如果包含则返回 true
   */
  contains?(parent: HN, child: HN): boolean;

  // ==========================================================
  // 扩展的属性操作
  // ==========================================================

  /**
   * 获取元素的所有属性名
   *
   * @param el - 宿主元素
   * @returns 属性名数组
   */
  getAttributeNames?(el: HE): string[];

  /**
   * 批量设置属性
   *
   * @param el - 宿主元素
   * @param attrs - 属性键值对
   */
  setAttributes?(el: HE, attrs: Record<string, unknown>): void;

  /**
   * 批量移除属性
   *
   * @param el - 宿主元素
   * @param keys - 要移除的属性名数组
   */
  removeAttributes?(el: HE, keys: string[]): void;

  // ==========================================================
  // 扩展的样式操作
  // ==========================================================

  /**
   * 批量设置样式
   *
   * @param el - 宿主元素
   * @param styles - 样式键值对
   */
  setStyles?(el: HE, styles: Record<string, string | null | undefined>): void;

  /**
   * 获取元素的所有 CSS 类名
   *
   * @param el - 宿主元素
   * @returns 类名数组
   */
  getClassList?(el: HE): string[];

  /**
   * 切换 CSS 类名
   *
   * @param el - 宿主元素
   * @param cls - 类名
   * @param force - 如果为 true 则添加，false 则移除，省略则切换
   * @returns 操作后类名是否存在
   */
  toggleClass?(el: HE, cls: string, force?: boolean): boolean;

  // ==========================================================
  // 扩展的事件操作
  // ==========================================================

  /**
   * 触发/分派事件
   *
   * @param el - 宿主元素
   * @param event - 事件名或事件对象
   * @param detail - 自定义事件详情数据
   * @returns 事件是否被取消
   */
  dispatchEvent?(el: HE, event: string | HostEvent, detail?: unknown): boolean;

  /**
   * 一次性事件监听
   *
   * @param el - 宿主元素
   * @param event - 事件名
   * @param handler - 事件处理器
   * @param options - 监听选项
   */
  onceEventListener?(
    el: HE,
    event: string,
    handler: HostEventHandler,
    options?: HostEventOptions,
  ): () => void;

  // ==========================================================
  // 扩展的 DOM 查询
  // ==========================================================

  /**
   * 查询所有匹配选择器的元素
   *
   * @param selector - CSS 选择器
   * @param context - 查询上下文（默认为 document）
   * @returns 匹配的元素数组
   */
  querySelectorAll?(selector: string, context?: HN): HE[];

  /**
   * 通过 ID 获取元素
   *
   * @param id - 元素 ID
   * @returns 元素或 null
   */
  getElementById?(id: string): HE | null;

  /**
   * 通过类名获取元素
   *
   * @param className - 类名
   * @param context - 查询上下文
   * @returns 元素数组
   */
  getElementsByClassName?(className: string, context?: HN): HE[];

  /**
   * 通过标签名获取元素
   *
   * @param tag - 标签名
   * @param context - 查询上下文
   * @returns 元素数组
   */
  getElementsByTagName?(tag: string, context?: HN): HE[];

  // ==========================================================
  // 扩展的滚动操作
  // ==========================================================

  /**
   * 滚动元素到视图
   *
   * @param el - 宿主元素
   * @param options - 滚动选项
   */
  scrollIntoView?(
    el: HE,
    options?: {
      behavior?: 'auto' | 'smooth';
      block?: 'start' | 'center' | 'end' | 'nearest';
      inline?: 'start' | 'center' | 'end' | 'nearest';
    },
  ): void;

  /**
   * 获取元素的滚动位置
   *
   * @param el - 宿主元素（null 表示 document）
   * @returns 滚动位置
   */
  getScrollPosition?(
    el?: HE | null,
  ): { scrollLeft: number; scrollTop: number };

  /**
   * 设置元素的滚动位置
   *
   * @param el - 宿主元素（null 表示 document）
   * @param left - 水平滚动位置
   * @param top - 垂直滚动位置
   */
  setScrollPosition?(el: HE | null, left: number, top: number): void;

  // ==========================================================
  // 扩展的尺寸操作
  // ==========================================================

  /**
   * 获取元素的尺寸信息
   *
   * @param el - 宿主元素
   * @returns 尺寸信息
   */
  getElementSize?(el: HE): {
    width: number;
    height: number;
    clientWidth: number;
    clientHeight: number;
    scrollWidth: number;
    scrollHeight: number;
  };

  /**
   * 获取元素相对于视口的位置
   *
   * @param el - 宿主元素
   * @returns 位置信息
   */
  getElementOffset?(el: HE): { left: number; top: number };
}

// ============================================================
// 宿主能力检测
// ============================================================

/**
 * 宿主能力标志
 */
export interface HostCapabilities {
  /** 支持 Shadow DOM */
  shadowDOM: boolean;
  /** 支持自定义元素 */
  customElements: boolean;
  /** 支持插槽（Slot） */
  slots: boolean;
  /** 支持模板（Template） */
  template: boolean;
  /** 支持 CSS 变量 */
  cssVariables: boolean;
  /** 支持 ResizeObserver */
  resizeObserver: boolean;
  /** 支持 IntersectionObserver */
  intersectionObserver: boolean;
  /** 支持 MutationObserver */
  mutationObserver: boolean;
  /** 支持 Web Animations API */
  webAnimations: boolean;
  /** 支持 CSS 动画 */
  cssAnimations: boolean;
  /** 支持 CSS 过渡 */
  cssTransitions: boolean;
}

/**
 * 检测宿主环境的能力
 *
 * @returns 宿主能力标志对象
 * @example
 * ```ts
 * const caps = detectHostCapabilities()
 * if (caps.shadowDOM) {
 *   // 使用 Shadow DOM
 * }
 * ```
 */
export function detectHostCapabilities(): HostCapabilities {
  const caps: HostCapabilities = {
    shadowDOM: false,
    customElements: false,
    slots: false,
    template: false,
    cssVariables: false,
    resizeObserver: false,
    intersectionObserver: false,
    mutationObserver: false,
    webAnimations: false,
    cssAnimations: false,
    cssTransitions: false,
  };

  if (typeof window === 'undefined') {
    return caps;
  }

  // Shadow DOM
  caps.shadowDOM = 'attachShadow' in HTMLElement.prototype;

  // Custom Elements
  caps.customElements = 'customElements' in window;

  // Slots
  caps.slots = 'HTMLSlotElement' in window;

  // Template
  caps.template = 'HTMLTemplateElement' in window;

  // CSS Variables
  try {
    caps.cssVariables =
      window.CSS && CSS.supports && CSS.supports('color', 'var(--test)');
  } catch {
    caps.cssVariables = false;
  }

  // ResizeObserver
  caps.resizeObserver = 'ResizeObserver' in window;

  // IntersectionObserver
  caps.intersectionObserver = 'IntersectionObserver' in window;

  // MutationObserver
  caps.mutationObserver = 'MutationObserver' in window;

  // Web Animations API
  caps.webAnimations = 'animate' in Element.prototype;

  // CSS Animations & Transitions (基本支持)
  caps.cssAnimations = true;
  caps.cssTransitions = true;

  return caps;
}

// ============================================================
// 宿主适配器工厂
// ============================================================

/**
 * 创建扩展宿主适配器的选项
 */
export interface CreateExtendedHostOptions {
  /** 基础宿主实现 */
  baseHost: RendererHost;
  /** 是否启用扩展的节点操作 */
  enableExtendedNodeOps?: boolean;
  /** 是否启用扩展的查询操作 */
  enableExtendedQuery?: boolean;
  /** 是否启用扩展的滚动操作 */
  enableExtendedScroll?: boolean;
}

/**
 * 为 Web DOM 环境创建扩展宿主适配器
 *
 * @param options - 创建选项
 * @returns 扩展的宿主适配器
 */
export function createExtendedWebHost(
  options: CreateExtendedHostOptions,
): ExtendedRendererHost {
  const { baseHost } = options;

  const extendedHost: ExtendedRendererHost = {
    ...baseHost,

    // 扩展的节点操作
    insertBefore(parent, newChild, referenceNode) {
      if (parent instanceof Element || parent instanceof DocumentFragment) {
        parent.insertBefore(newChild as Node, referenceNode as Node | null);
      }
    },

    replaceChild(parent, newChild, oldChild) {
      if (parent instanceof Element || parent instanceof DocumentFragment) {
        parent.replaceChild(newChild as Node, oldChild as Node);
      }
      return oldChild;
    },

    firstChild(node) {
      return (node as Node).firstChild as unknown as typeof node;
    },

    lastChild(node) {
      return (node as Node).lastChild as unknown as typeof node;
    },

    contains(parent, child) {
      if (parent instanceof Element) {
        return parent.contains(child as Node);
      }
      return false;
    },

    // 扩展的属性操作
    getAttributeNames(el) {
      if (el instanceof Element) {
        return Array.from(el.getAttributeNames());
      }
      return [];
    },

    setAttributes(el, attrs) {
      if (el instanceof Element) {
        Object.entries(attrs).forEach(([key, value]) => {
          if (value == null) {
            el.removeAttribute(key);
          } else {
            el.setAttribute(key, String(value));
          }
        });
      }
    },

    removeAttributes(el, keys) {
      if (el instanceof Element) {
        keys.forEach((key) => el.removeAttribute(key));
      }
    },

    // 扩展的样式操作
    setStyles(el, styles) {
      if (el instanceof HTMLElement) {
        Object.entries(styles).forEach(([key, value]) => {
          if (value == null) {
            el.style.removeProperty(key);
          } else {
            el.style.setProperty(key, value);
          }
        });
      }
    },

    getClassList(el) {
      if (el instanceof Element) {
        return Array.from(el.classList);
      }
      return [];
    },

    toggleClass(el, cls, force) {
      if (el instanceof Element) {
        return el.classList.toggle(cls, force);
      }
      return false;
    },

    // 扩展的事件操作
    dispatchEvent(el, event, detail) {
      if (el instanceof Element) {
        let evt: Event;
        if (typeof event === 'string') {
          evt =
            detail !== undefined
              ? new CustomEvent(event, { detail })
              : new Event(event);
        } else {
          evt = event as Event;
        }
        return el.dispatchEvent(evt);
      }
      return false;
    },

    onceEventListener(el, event, handler, options) {
      if (el instanceof Element) {
        const wrappedHandler = (e: Event) => {
          handler(e as unknown as HostEvent);
          el.removeEventListener(event, wrappedHandler, options);
        };
        el.addEventListener(event, wrappedHandler, options);
        return () => el.removeEventListener(event, wrappedHandler, options);
      }
      return () => {};
    },

    // 扩展的 DOM 查询
    querySelectorAll(selector, context) {
      const root =
        (context as Element | undefined) ??
        (typeof document !== 'undefined' ? document : null);
      if (root instanceof Element || root instanceof Document) {
        return Array.from(root.querySelectorAll(selector)) as Element[];
      }
      return [];
    },

    getElementById(id) {
      if (typeof document !== 'undefined') {
        return document.getElementById(id);
      }
      return null;
    },

    getElementsByClassName(className, context) {
      const root =
        (context as Element | undefined) ??
        (typeof document !== 'undefined' ? document.body : null);
      if (root instanceof Element) {
        return Array.from(root.getElementsByClassName(className));
      }
      return [];
    },

    getElementsByTagName(tag, context) {
      const root =
        (context as Element | undefined) ??
        (typeof document !== 'undefined' ? document.body : null);
      if (root instanceof Element) {
        return Array.from(root.getElementsByTagName(tag));
      }
      return [];
    },

    // 扩展的滚动操作
    scrollIntoView(el, options) {
      if (el instanceof Element) {
        el.scrollIntoView(options);
      }
    },

    getScrollPosition(el) {
      if (el instanceof Element) {
        return { scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
      }
      if (typeof window !== 'undefined' && el === null) {
        return {
          scrollLeft: window.pageXOffset || document.documentElement.scrollLeft,
          scrollTop: window.pageYOffset || document.documentElement.scrollTop,
        };
      }
      return { scrollLeft: 0, scrollTop: 0 };
    },

    setScrollPosition(el, left, top) {
      if (el instanceof Element) {
        el.scrollLeft = left;
        el.scrollTop = top;
      } else if (el === null && typeof window !== 'undefined') {
        window.scrollTo(left, top);
      }
    },

    // 扩展的尺寸操作
    getElementSize(el) {
      if (el instanceof Element) {
        const rect = el.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          clientWidth: (el as HTMLElement).clientWidth,
          clientHeight: (el as HTMLElement).clientHeight,
          scrollWidth: (el as HTMLElement).scrollWidth,
          scrollHeight: (el as HTMLElement).scrollHeight,
        };
      }
      return {
        width: 0,
        height: 0,
        clientWidth: 0,
        clientHeight: 0,
        scrollWidth: 0,
        scrollHeight: 0,
      };
    },

    getElementOffset(el) {
      if (el instanceof Element) {
        const rect = el.getBoundingClientRect();
        return {
          left: rect.left + window.pageXOffset,
          top: rect.top + window.pageYOffset,
        };
      }
      return { left: 0, top: 0 };
    },
  };

  return extendedHost;
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 检查宿主是否支持指定能力
 *
 * @param capability - 能力名称
 * @returns 如果支持则返回 true
 */
export function supportsHostCapability(
  capability: keyof HostCapabilities,
): boolean {
  const caps = detectHostCapabilities();
  return caps[capability];
}

/**
 * 等待宿主环境就绪
 *
 * @returns Promise
 */
export function waitForHostReady(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document !== 'undefined') {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', () => resolve(), { once: true });
      }
    } else {
      resolve();
    }
  });
}
