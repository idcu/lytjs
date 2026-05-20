// @lytjs/host-contract - types
// 统一渲染宿主接口定义（跨平台抽象契约）

// ============================================================
// 几何信息（用于 FLIP / TransitionGroup）
// ============================================================

/**
 * 宿主元素的几何边界信息。
 *
 * Web: DOMRect
 * 小程序: { left, top, width, height, right, bottom }
 * SSR: { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 }
 */
export interface HostRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

// ============================================================
// 计算样式信息（用于 Transition）
// ============================================================

/**
 * 宿主元素的样式声明（平台无关抽象）。
 *
 * Web: CSSStyleDeclaration
 * 小程序: Record<string, string>
 * SSR: Record<string, string> (空)
 */
export interface HostStyleDeclaration {
  getPropertyValue(prop: string): string;
}

/**
 * 过渡/动画时长信息。
 */
export interface TransitionDurationInfo {
  /** 总过渡时长（ms） */
  duration: number;
  /** 是否存在 CSS transition */
  hasTransition: boolean;
  /** 是否存在 CSS animation */
  hasAnimation: boolean;
}

// ============================================================
// 事件相关类型
// ============================================================

/**
 * 宿主事件对象（平台无关的事件抽象）。
 *
 * L2 的事件归一模块将各端原生事件映射为此接口。
 */
export interface HostEvent {
  /** 事件类型 */
  type: string;
  /** 事件原始目标 */
  target: unknown;
  /** 事件当前目标 */
  currentTarget: unknown;
  /** 阻止默认行为 */
  preventDefault(): void;
  /** 阻止冒泡 */
  stopPropagation(): void;
  /** 原始事件对象（用于需要平台特定信息的场景） */
  nativeEvent: unknown;
}

/**
 * 事件监听器类型。
 */
export type HostEventHandler = (event: HostEvent) => void;

/**
 * 事件监听选项。
 */
export interface HostEventOptions {
  capture?: boolean;
  once?: boolean;
  passive?: boolean;
}

// ============================================================
// 核心接口：RendererHost
// ============================================================

/**
 * 统一渲染宿主接口。
 *
 * 所有平台适配器（Web / 小程序 / Android / SSR）必须实现此接口。
 * L1 的 createRenderer 通过此接口与平台解耦。
 *
 * 接口分为 7 个操作维度：
 * 1. 节点操作（CRUD）
 * 2. 属性操作（patchProp）
 * 3. 样式操作（class / style / computed）
 * 4. 事件操作（addEventListener / removeEventListener）
 * 5. 过渡动画（getBoundingClientRect / getTransitionInfo）
 * 6. 时序调度（nextFrame / setTimeout）
 * 7. 其他（hydration 辅助、namespace 检测等）
 *
 * @template HN - 宿主节点类型（Web: Node, 小程序: WxNode, SSR: SSRNode）
 * @template HE - 宿主元素类型，HN 的子类型（Web: Element, 小程序: WxElement）
 */
export interface RendererHost<HN = unknown, HE extends HN = HN> {
  // FIX: P0-03 添加渲染宿主标识符号，用于 createRenderer 中精确区分 RendererHost 和 RendererOptions
  /** @internal 渲染宿主标识符号，用于类型检测 */
  readonly __isRendererHost?: true;

  // ==========================================================
  // 一、节点操作 (Node Operations)
  // ==========================================================

  /**
   * 创建元素节点。
   * @param tag - 标签名（如 'div', 'span', 'svg'）
   * @param isSVG - 是否 SVG 元素（用于命名空间处理）
   */
  createElement(tag: string, isSVG?: boolean): HE;

  /** 创建文本节点 */
  createText(text: string): HN;

  /** 创建注释节点 */
  createComment(text: string): HN;

  /** 设置元素文本内容（覆盖所有子节点） */
  setElementText(node: HE, text: string): void;

  /** 设置文本/注释节点的内容 */
  setText(node: HN, text: string): void;

  /**
   * 在父节点的 anchor 前插入子节点。
   * anchor 为 null 时追加到末尾。
   */
  insert(child: HN, parent: HN, anchor?: HN | null): void;

  /** 从父节点移除子节点 */
  remove(child: HN): void;

  /** 获取下一个兄弟节点 */
  nextSibling(node: HN): HN | null;

  /** 获取父节点 */
  parentNode(node: HN): HN | null;

  /**
   * 查询选择器（用于 Teleport 目标查找等场景）。
   * SSR 环境可返回 null。
   */
  querySelector(selector: string): HE | null;

  // ==========================================================
  // 二、属性操作 (Property Operations)
  // ==========================================================

  /**
   * 统一属性 patch 入口。
   *
   * 根据 key 的类型分发到具体的属性处理逻辑：
   * - class → 样式类名更新
   * - style → 内联样式更新
   * - onXxx → 事件绑定
   * - 其他 → HTML attribute / DOM property
   *
   * @param el - 宿主元素
   * @param key - 属性名
   * @param prevValue - 旧值
   * @param nextValue - 新值
   * @param isSVG - 是否 SVG 元素
   */
  patchProp(el: HE, key: string, prevValue: unknown, nextValue: unknown, isSVG?: boolean): void;

  // ==========================================================
  // 三、样式操作 (Style Operations)
  // ==========================================================

  /** 添加 CSS 类名 */
  addClass(el: HE, cls: string): void;

  /** 移除 CSS 类名 */
  removeClass(el: HE, cls: string): void;

  /** 检查是否包含 CSS 类名 */
  hasClass(el: HE, cls: string): boolean;

  /**
   * 设置内联样式属性。
   * value 为 null/undefined 时移除该样式属性。
   */
  setStyle(el: HE, key: string, value: string | null | undefined): void;

  /** 移除内联样式属性 */
  removeStyle(el: HE, key: string): void;

  /**
   * 获取计算样式（用于过渡动画时长检测）。
   * SSR / 小程序等不支持的环境返回空声明。
   */
  getComputedStyle(el: HE): HostStyleDeclaration;

  /**
   * 强制回流/重排（用于过渡动画触发）。
   * 在添加过渡起始类后调用，确保浏览器记录初始状态。
   * SSR / 小程序等不支持的环境为空操作。
   */
  forceReflow(el: HE): void;

  // ==========================================================
  // 四、事件操作 (Event Operations)
  // ==========================================================

  /**
   * 添加事件监听器。
   * 返回一个取消监听的函数。
   */
  addEventListener(
    el: HE,
    event: string,
    handler: HostEventHandler,
    options?: HostEventOptions,
  ): () => void;

  /**
   * 移除事件监听器。
   */
  removeEventListener(
    el: HE,
    event: string,
    handler: HostEventHandler,
    options?: HostEventOptions,
  ): void;

  // ==========================================================
  // 五、过渡动画 (Transition Operations)
  // ==========================================================

  /**
   * 获取元素的几何边界信息（用于 FLIP 动画）。
   * SSR / 小程序等不支持的环境返回零值。
   */
  getBoundingClientRect(el: HE): HostRect;

  /** 获取元素的指定属性值 */
  getAttribute(el: HE, key: string): string | null;

  /**
   * 获取过渡/动画时长信息。
   * 通过读取计算样式中的 transition-duration / animation-duration 获取。
   */
  getTransitionInfo(el: HE, type: 'enter' | 'leave'): TransitionDurationInfo;

  // ==========================================================
  // 六、时序调度 (Timing Operations)
  // ==========================================================

  /**
   * 请求下一帧回调（双 rAF 确保浏览器已绘制）。
   *
   * Web: requestAnimationFrame(() => requestAnimationFrame(fn))
   * 小程序: setTimeout(fn, 32)
   * SSR: 同步执行
   */
  nextFrame(fn: () => void): void;

  /**
   * 延迟执行。
   *
   * Web: window.setTimeout
   * 小程序: setTimeout
   * SSR: 同步执行
   */
  setTimeout(fn: () => void, ms: number): number;

  /** 取消延迟执行 */
  clearTimeout(id: number): void;

  // ==========================================================
  // 七、其他 (Miscellaneous)
  // ==========================================================

  /**
   * 获取元素的 namespaceURI（用于 SVG 检测）。
   * 返回 null 表示非 SVG 命名空间。
   */
  getNamespaceURI?(el: HE): string | null;

  /**
   * 替换子节点（用于 hydration mismatch 处理）。
   */
  replaceChild?(parent: HN, newChild: HN, oldChild: HN): void;

  /**
   * 获取子节点列表（用于 hydration）。
   */
  getChildNodes?(el: HE): HN[];

  /**
   * 获取节点类型（用于 hydration 判断）。
   *
   * Web: Node.ELEMENT_NODE(1) / Node.TEXT_NODE(3) / Node.COMMENT_NODE(8)
   */
  getNodeType?(node: HN): number;

  /**
   * 获取元素标签名（用于 hydration 匹配）。
   * 返回小写标签名。
   */
  getTagName?(el: HE): string;
}
