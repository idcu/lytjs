/**
 * @lytjs/platform-adapter
 * 平台适配器类型定义
 *
 * @description
 * 定义跨平台渲染适配器的核心接口，所有平台实现必须遵循此契约。
 * HN = Host Node（宿主节点），HE = Host Element（宿主元素）
 */

/**
 * 平台适配器接口 - 所有平台必须实现此接口
 *
 * @description
 * 提供跨平台的 DOM 操作抽象层，将底层平台差异封装为统一 API。
 * 每个平台（Web、小程序、Node.js SSR 等）都需要提供自己的实现。
 *
 * @template HN - 宿主节点类型
 * @template HE - 宿主元素类型（extends HN）
 *
 * @example
 * ```typescript
 * const webAdapter: PlatformAdapter<Node, Element> = {
 *   name: 'web',
 *   version: '1.0.0',
 *   createElement(tag) { return document.createElement(tag); },
 *   // ... 其他方法
 * };
 * ```
 */
export interface PlatformAdapter<HN = unknown, HE = unknown> {
  /** 平台名称（如 'web'、'miniapp'、'ssr'） */
  readonly name: string;
  /** 平台版本号 */
  readonly version: string;

  // ---- 节点操作 ----

  /**
   * 创建元素节点
   * @param tag - 标签名
   * @returns 创建的元素节点
   */
  createElement(tag: string): HE;

  /**
   * 创建文本节点
   * @param text - 文本内容
   * @returns 创建的文本节点
   */
  createText(text: string): HN;

  /**
   * 创建注释节点
   * @param text - 注释内容
   * @returns 创建的注释节点
   */
  createComment(text: string): HN;

  /**
   * 插入子节点到父节点中
   * @param child - 子节点
   * @param parent - 父节点
   * @param anchor - 参考锚点，插入到锚点之前
   */
  insert(child: HN, parent: HN, anchor?: HN | null): void;

  /**
   * 移除子节点
   * @param child - 要移除的节点
   */
  remove(child: HN): void;

  /**
   * 设置元素节点的文本内容
   * @param node - 元素节点
   * @param text - 文本内容
   */
  setElementText(node: HE, text: string): void;

  /**
   * 设置文本节点的内容
   * @param node - 文本节点
   * @param text - 文本内容
   */
  setText(node: HN, text: string): void;

  // ---- 属性操作 ----

  /**
   * 设置元素属性
   * @param el - 元素节点
   * @param key - 属性名
   * @param value - 属性值
   */
  setAttribute(el: HE, key: string, value: string): void;

  /**
   * 移除元素属性
   * @param el - 元素节点
   * @param key - 属性名
   */
  removeAttribute(el: HE, key: string): void;

  /**
   * 获取元素属性值
   * @param el - 元素节点
   * @param key - 属性名
   * @returns 属性值，不存在时返回 null
   */
  getAttribute(el: HE, key: string): string | null;

  /**
   * 检查元素是否拥有指定属性
   * @param el - 元素节点
   * @param key - 属性名
   * @returns 是否存在该属性
   */
  hasAttribute(el: HE, key: string): boolean;

  // ---- 样式操作 ----

  /**
   * 设置元素的行内样式
   * @param el - 元素节点
   * @param style - CSS 样式字符串
   */
  setStyle(el: HE, style: string): void;

  /**
   * 获取元素的行内样式字符串
   * @param el - 元素节点
   * @returns CSS 样式字符串
   */
  getStyle(el: HE): string;

  // ---- 类名操作 ----

  /**
   * 添加 CSS 类名
   * @param el - 元素节点
   * @param className - 类名
   */
  addClass(el: HE, className: string): void;

  /**
   * 移除 CSS 类名
   * @param el - 元素节点
   * @param className - 类名
   */
  removeClass(el: HE, className: string): void;

  /**
   * 检查元素是否包含指定类名
   * @param el - 元素节点
   * @param className - 类名
   * @returns 是否包含该类名
   */
  hasClass(el: HE, className: string): boolean;

  // ---- 事件操作 ----

  /**
   * 添加事件监听器
   * @param el - 元素节点
   * @param event - 事件名称
   * @param handler - 事件处理函数
   */
  addEventListener(
    el: HE,
    event: string,
    handler: (...args: unknown[]) => void,
  ): void;

  /**
   * 移除事件监听器
   * @param el - 元素节点
   * @param event - 事件名称
   * @param handler - 事件处理函数
   */
  removeEventListener(
    el: HE,
    event: string,
    handler: (...args: unknown[]) => void,
  ): void;

  // ---- 查询 ----

  /**
   * 查询匹配选择器的第一个元素
   * @param selector - CSS 选择器
   * @returns 匹配的元素，未找到时返回 null
   */
  querySelector(selector: string): HE | null;

  /**
   * 查询匹配选择器的所有元素
   * @param selector - CSS 选择器
   * @returns 匹配的元素数组
   */
  querySelectorAll(selector: string): HE[];

  // ---- 生命周期 ----

  /**
   * 注册平台就绪回调
   * @param callback - 就绪时执行的回调函数
   */
  onReady(callback: () => void): void;

  /**
   * 注册平台卸载回调
   * @param callback - 卸载时执行的回调函数
   */
  onUnmount(callback: () => void): void;
}

/**
 * 平台配置
 *
 * @description
 * 用于配置平台适配器的行为，如调试模式和自定义渲染器选项。
 */
export interface PlatformConfig {
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 自定义渲染器选项 */
  rendererOptions?: Record<string, unknown>;
}

/**
 * 平台插件接口
 *
 * @description
 * 允许扩展平台适配器的功能，插件可以在安装时修改适配器行为。
 *
 * @template HN - 宿主节点类型
 * @template HE - 宿主元素类型
 *
 * @example
 * ```typescript
 * const analyticsPlugin: PlatformPlugin = {
 *   name: 'analytics',
 *   install(adapter) {
 *     const originalInsert = adapter.insert.bind(adapter);
 *     adapter.insert = (child, parent, anchor) => {
 *       console.log('节点插入', child);
 *       originalInsert(child, parent, anchor);
 *     };
 *   },
 *   uninstall() {
 *     console.log('分析插件已卸载');
 *   },
 * };
 * ```
 */
export interface PlatformPlugin<HN = unknown, HE = unknown> {
  /** 插件名称 */
  name: string;
  /** 安装插件到适配器 */
  install(adapter: PlatformAdapter<HN, HE>): void;
  /** 卸载插件（可选） */
  uninstall?(): void;
}
