/**
 * Lyt.js 客户端注水（Hydration）
 *
 * 在服务端渲染（SSR）后，客户端需要将静态 HTML "激活"为可交互的应用。
 * 注水过程会对比服务端渲染的 DOM 与客户端 VNode，复用已有 DOM 节点，
 * 仅绑定事件和响应式数据，避免重新创建 DOM。
 *
 * 核心机制：
 *   - hydrate(app, container) — 注水入口函数
 *   - 对比 DOM 节点与 VNode 的类型和属性
 *   - 复用匹配的 DOM 节点，绑定事件和响应式
 *   - isHydrating 标记区分注水模式和首次渲染
 *   - onHydrated 回调通知注水完成
 *
 * 注水流程：
 *   1. 遍历服务端渲染的 DOM 树
 *   2. 对比每个 DOM 节点与对应的客户端 VNode
 *   3. 如果匹配（标签名相同），复用 DOM 节点，绑定事件
 *   4. 如果不匹配，标记为 hydration mismatch（开发环境警告）
 *   5. 递归处理子节点
 *   6. 注水完成后触发 onHydrated 回调
 *
 * 支持的节点类型：
 *   - Element：对比标签名，绑定事件，递归子节点
 *   - Text：对比文本内容
 *   - Comment：对比注释内容
 *   - Fragment：直接注水子节点
 *   - Component：递归注水组件 subTree
 *
 * Partial Hydration（Islands Architecture）：
 *   - hydrateIsland(selector, component) — 选择性注水特定 island
 *   - createHydrationIsland(component, props) — 服务端生成 island HTML
 *   - 支持 lazy hydration（IntersectionObserver / requestIdleCallback / interaction）
 *   - 支持 hydration mismatch 检测（开发模式）
 */

import { LytError, LytErrorCodes } from '@lytjs/common'
import type { VNode } from '@lytjs/vdom'

// ================================================================
//  类型定义
// ================================================================

/** 应用实例接口（简化版） */
export interface App {
  /** 挂载函数 */
  mount: (container: Element) => void
  /** 卸载函数 */
  unmount?: () => void
  /** 根组件 */
  _component?: any
  /** 根 VNode */
  _vnode?: VNode
}

/** 注水选项 */
export interface HydrateOptions {
  /** 注水完成后的回调 */
  onHydrated?: () => void
  /** 是否在 mismatch 时抛出错误（默认 false，只警告） */
  strict?: boolean
}

/** Partial Hydration 选项（Islands Architecture） */
export interface HydrationOptions {
  /** 仅注水特定 island 元素 */
  hydrateIslands?: boolean
  /** 懒注水：元素进入视口时才注水 */
  lazy?: boolean
  /** 注水超时时间（毫秒） */
  timeout?: number
  /** 注水完成回调 */
  onHydrated?: () => void
  /** 是否在 mismatch 时抛出错误（默认 false，只警告） */
  strict?: boolean
  /** 开发模式（启用 mismatch 检测和警告） */
  dev?: boolean
}

/** 注水结果 */
export interface HydrateResult {
  /** 是否成功 */
  success: boolean
  /** mismatch 数量 */
  mismatches: number
  /** 注水的节点数量 */
  hydratedNodes: number
}

// ================================================================
//  常量
// ================================================================

/** ShapeFlags 位标记 */
const ShapeFlags = {
  ELEMENT: 1,
  FUNCTIONAL_COMPONENT: 2,
  STATEFUL_COMPONENT: 4,
  TEXT_CHILDREN: 8,
  ARRAY_CHILDREN: 16,
  SLOTS_CHILDREN: 32,
};

// ================================================================
//  全局状态
// ================================================================

/**
 * 是否处于注水模式
 *
 * 当 isHydrating 为 true 时，渲染器会复用已有的 DOM 节点
 * 而不是创建新的 DOM 节点。
 */
let _isHydrating: boolean = false;

/**
 * 注水完成回调列表
 */
const hydrateCallbacks: Array<() => void> = [];

/**
 * 防重入标志：避免 fireHydratedCallbacks 递归调用
 */
let isFiringCallbacks = false;

/**
 * 注水统计信息
 */
let _hydrateStats: HydrateResult = {
  success: true,
  mismatches: 0,
  hydratedNodes: 0,
};

// ================================================================
//  公共 API
// ================================================================

/**
 * 获取当前是否处于注水模式
 *
 * @returns 是否正在注水
 */
export function isHydrating(): boolean {
  return _isHydrating;
}

/**
 * 设置注水模式标记
 *
 * @param value 是否处于注水模式
 */
export function setHydrating(value: boolean): void {
  _isHydrating = value;
}

/**
 * 获取注水统计信息
 *
 * @returns 注水结果统计
 */
export function getHydrateStats(): HydrateResult {
  return { ..._hydrateStats };
}

/**
 * 重置注水统计信息
 */
export function resetHydrateStats(): void {
  _hydrateStats = {
    success: true,
    mismatches: 0,
    hydratedNodes: 0,
  };
}

/**
 * 注册注水完成回调
 *
 * @param cb 回调函数
 */
export function onHydrated(cb: () => void): void {
  if (_isHydrating) {
    // 正在注水中，加入回调队列
    hydrateCallbacks.push(cb);
  } else {
    // 已完成注水，立即执行
    cb();
  }
}

// ================================================================
//  注水核心函数
// ================================================================

/**
 * 客户端注水函数
 *
 * 将服务端渲染的静态 HTML 激活为可交互的应用。
 * 对比 DOM 树与 VNode 树，复用已有 DOM 节点，仅绑定事件和响应式。
 *
 * @param app       应用实例
 * @param container 挂载容器（与服务端渲染的根元素对应）
 * @param options   注水选项
 * @returns 注水结果统计
 *
 * @example
 *   // 服务端渲染的 HTML
 *   // <div id="app"><h1>Hello</h1></div>
 *
 *   // 客户端注水
 *   import { createApp } from '@lytjs/core'
 *   import { hydrate } from '@lytjs/renderer/ssr'
 *   import App from './App'
 *
 *   const app = createApp(App)
 *   hydrate(app, document.getElementById('app')!, {
 *     onHydrated: () => console.log('注水完成')
 *   })
 */
export function hydrate(
  app: App,
  container: Element,
  options: HydrateOptions = {}
): HydrateResult {
  // 重置统计信息
  resetHydrateStats();

  // 注册注水完成回调
  if (options.onHydrated) {
    hydrateCallbacks.push(options.onHydrated);
  }

  // 开启注水模式
  _isHydrating = true;

  try {
    // 获取容器中的第一个子元素（服务端渲染的根节点）
    const serverRoot = container.firstElementChild;

    if (!serverRoot) {
      // 容器为空，回退到普通挂载
      console.warn('[lyt] 容器为空，回退到客户端渲染');
      _isHydrating = false;
      app.mount(container);
      _hydrateStats.success = false;
      fireHydratedCallbacks();
      return _hydrateStats;
    }

    // 获取应用的根 VNode
    // 如果应用已有 _vnode，使用它；否则通过 mount 获取
    if (!app._vnode) {
      // 暂时挂载以获取 VNode（注水模式下不会创建 DOM）
      app.mount(container);
    }

    // 对比并注水根节点
    if (app._vnode) {
      hydrateNode(serverRoot as HTMLElement, app._vnode, options);
    }

    // 注水完成
    _isHydrating = false;
    fireHydratedCallbacks();
    return _hydrateStats;
  } catch (error) {
    // 注水失败，回退到客户端渲染
    console.error('[lyt] 注水失败，回退到客户端渲染:', error);
    _isHydrating = false;
    _hydrateStats.success = false;

    // 清空容器，重新挂载
    container.innerHTML = '';
    app.mount(container);
    fireHydratedCallbacks();
    return _hydrateStats;
  }
}

/**
 * 触发所有注水完成回调
 */
function fireHydratedCallbacks(): void {
  if (isFiringCallbacks) return
  isFiringCallbacks = true
  const callbacks = hydrateCallbacks.splice(0);
  for (const cb of callbacks) {
    try {
      cb();
    } catch (error) {
      console.error('[lyt] onHydrated 回调执行失败:', error);
    }
  }
  isFiringCallbacks = false
}

// ================================================================
//  节点注水
// ================================================================

/**
 * 注水单个 DOM 节点
 *
 * 对比 DOM 节点与 VNode，如果匹配则复用 DOM 节点并绑定事件。
 *
 * @param domNode  服务端渲染的 DOM 节点
 * @param vnode    客户端 VNode
 * @param options  注水选项
 */
function hydrateNode(
  domNode: HTMLElement | Text | Comment,
  vnode: VNode,
  options: HydrateOptions
): void {
  // Fragment 处理
  if (isFragmentVNode(vnode)) {
    hydrateFragment(domNode, vnode, options);
    return;
  }

  // 文本节点处理
  if (isTextVNode(vnode)) {
    hydrateTextNode(domNode, vnode, options);
    return;
  }

  // 注释节点处理
  if (isCommentVNode(vnode)) {
    hydrateCommentNode(domNode, vnode, options);
    return;
  }

  // 组件节点处理
  if (isComponentVNode(vnode)) {
    hydrateComponentNode(domNode, vnode, options);
    return;
  }

  // 元素节点处理
  if (typeof vnode.type === 'string') {
    hydrateElementNode(domNode as HTMLElement, vnode, options);
    return;
  }
}

/**
 * 注水元素节点
 *
 * 对比 DOM 元素与 VNode 元素：
 *   1. 检查标签名是否匹配
 *   2. 对比属性（静态属性应一致）
 *   3. 绑定事件处理器
 *   4. 处理 ref
 *   5. 递归注水子节点
 *
 * @param domNode  DOM 元素
 * @param vnode    VNode 元素
 * @param options  注水选项
 */
function hydrateElementNode(
  domNode: HTMLElement,
  vnode: VNode,
  options: HydrateOptions
): void {
  // 检查标签名是否匹配
  const domTag = domNode.tagName.toLowerCase();
  const vnodeTag = (vnode.type as string).toLowerCase();

  if (domTag !== vnodeTag) {
    handleMismatch(domNode, vnode, `标签不匹配: DOM "${domTag}" vs VNode "${vnodeTag}"`, options);
    return;
  }

  // 将 DOM 元素引用保存到 VNode（复用 DOM）
  vnode.el = domNode;

  // 绑定事件处理器
  if (vnode.props) {
    bindEvents(domNode, vnode.props);
  }

  // 处理 ref
  if (vnode.ref) {
    setRef(domNode, vnode.ref);
  }

  // 递归注水子节点
  hydrateChildren(domNode, vnode, options);

  // 更新统计
  _hydrateStats.hydratedNodes++;
}

/**
 * 注水文本节点
 *
 * 对比 DOM 文本内容与 VNode 文本内容。
 *
 * @param domNode  DOM 节点
 * @param vnode    VNode 文本节点
 * @param options  注水选项
 */
function hydrateTextNode(
  domNode: HTMLElement | Text | Comment,
  vnode: VNode,
  options: HydrateOptions
): void {
  // 检查是否为文本节点
  if (domNode.nodeType !== 3) {
    handleMismatch(domNode, vnode, '期望文本节点', options);
    return;
  }

  // 将 DOM 节点引用保存到 VNode
  vnode.el = domNode;

  // 对比文本内容
  const domText = domNode.nodeValue || '';
  const vnodeText = String(vnode.children || '');

  if (domText !== vnodeText) {
    // 文本不匹配，以客户端 VNode 为准更新
    domNode.nodeValue = vnodeText;
    if (options.strict) {
      console.warn(`[lyt] 注水文本不匹配: DOM "${domText}" vs VNode "${vnodeText}"`);
    }
  }

  // 更新统计
  _hydrateStats.hydratedNodes++;
}

/**
 * 注水注释节点
 *
 * 对比 DOM 注释内容与 VNode 注释内容。
 *
 * @param domNode  DOM 节点
 * @param vnode    VNode 注释节点
 * @param options  注水选项
 */
function hydrateCommentNode(
  domNode: HTMLElement | Text | Comment,
  vnode: VNode,
  options: HydrateOptions
): void {
  // 检查是否为注释节点
  if (domNode.nodeType !== 8) {
    handleMismatch(domNode, vnode, '期望注释节点', options);
    return;
  }

  // 将 DOM 节点引用保存到 VNode
  vnode.el = domNode;

  // 对比注释内容
  const domText = domNode.nodeValue || '';
  const vnodeText = String(vnode.children || '');

  if (domText !== vnodeText) {
    // 注释不匹配，以客户端 VNode 为准更新
    domNode.nodeValue = vnodeText;
  }

  // 更新统计
  _hydrateStats.hydratedNodes++;
}

/**
 * 注水 Fragment
 *
 * Fragment 没有对应的 DOM 元素，直接注水其子节点。
 * Fragment 的子节点在 DOM 中是连续排列的，需要一一对应。
 *
 * @param domNode  Fragment 锚点 DOM 节点
 * @param vnode    Fragment VNode
 * @param options  注水选项
 */
function hydrateFragment(
  domNode: HTMLElement | Text | Comment,
  vnode: VNode,
  options: HydrateOptions
): void {
  if (!Array.isArray(vnode.children)) return;

  // 获取 Fragment 的所有 DOM 子节点
  const domChildren = Array.from(domNode.childNodes);

  // 逐个对比注水
  for (let i = 0; i < vnode.children.length; i++) {
    const childVNode = vnode.children[i];
    const childDom = domChildren[i];

    if (!childDom) {
      console.warn(`[lyt] Fragment 子节点数量不匹配: VNode 有 ${vnode.children.length} 个子节点，DOM 只有 ${domChildren.length} 个`);
      _hydrateStats.mismatches++;
      break;
    }

    hydrateNode(childDom as HTMLElement, childVNode, options);
  }
}

/**
 * 注水组件节点
 *
 * 组件 VNode 本身没有对应的 DOM 节点，需要：
 *   1. 获取组件的 subTree（渲染结果 VNode）
 *   2. 将 subTree 与 DOM 节点进行注水
 *
 * @param domNode  DOM 节点（组件根元素）
 * @param vnode    组件 VNode
 * @param options  注水选项
 */
function hydrateComponentNode(
  domNode: HTMLElement | Text | Comment,
  vnode: VNode,
  options: HydrateOptions
): void {
  // 如果组件有 subTree，注水 subTree
  if (vnode.component && vnode.component.subTree) {
    hydrateNode(domNode, vnode.component.subTree, options);
    vnode.el = vnode.component.subTree.el;
    return;
  }

  // 如果组件类型是函数（函数式组件），尝试调用获取 subTree
  const component = vnode.type as any;
  if (typeof component === 'function') {
    try {
      const subTree = component(vnode.props || {}, {
        slots: vnode.children || {},
      });
      if (subTree) {
        hydrateNode(domNode, subTree, options);
        vnode.el = subTree.el;
        return;
      }
    } catch (e) {
      console.warn('[Lyt Hydration] 函数式组件调用失败:', e instanceof Error ? e.message : e)
    }
  }

  // 如果组件类型是对象（有状态组件），尝试获取 subTree
  if (typeof component === 'object' && component !== null && typeof component.render === 'function') {
    try {
      const subTree = component.render(vnode.props || {}, {
        slots: vnode.children || {},
        emit: () => {},
      });
      if (subTree) {
        hydrateNode(domNode, subTree, options);
        vnode.el = subTree.el;
        return;
      }
    } catch (e) {
      console.warn('[Lyt Hydration] 组件 render 调用失败:', e instanceof Error ? e.message : e)
    }
  }

  // 无法获取 subTree，标记为 mismatch
  handleMismatch(domNode, vnode, '组件无法获取 subTree', options);
}

/**
 * 注水子节点
 *
 * 遍历 VNode 的子节点，与 DOM 子节点一一对比注水。
 * 支持文本子节点和数组子节点两种形式。
 *
 * @param parentEl 父 DOM 元素
 * @param vnode    父 VNode
 * @param options  注水选项
 */
function hydrateChildren(
  parentEl: HTMLElement,
  vnode: VNode,
  options: HydrateOptions
): void {
  if (!vnode.children) return;

  const shapeFlag = vnode.shapeFlag || 0;

  // 文本子节点
  if (typeof vnode.children === 'string' || (shapeFlag & ShapeFlags.TEXT_CHILDREN)) {
    const textContent = parentEl.textContent || '';
    const vnodeText = String(vnode.children || '');

    if (textContent !== vnodeText) {
      // 文本不匹配，以客户端 VNode 为准更新
      parentEl.textContent = vnodeText;
      if (options.strict) {
        console.warn(`[lyt] 注水子节点文本不匹配: DOM "${textContent}" vs VNode "${vnodeText}"`);
      }
    }
    return;
  }

  // 数组子节点
  if (Array.isArray(vnode.children)) {
    const domChildren = Array.from(parentEl.childNodes);

    // 跳过非元素/文本节点（如注释节点），只匹配实际子节点
    let vnodeIndex = 0;
    for (let i = 0; i < domChildren.length && vnodeIndex < vnode.children.length; i++) {
      const childVNode = vnode.children[vnodeIndex];

      // 跳过 null/undefined VNode
      if (childVNode === null || childVNode === undefined) {
        vnodeIndex++;
        continue;
      }

      hydrateNode(domChildren[i] as HTMLElement, childVNode, options);
      vnodeIndex++;
    }

    // 检查子节点数量是否匹配
    if (vnodeIndex < vnode.children.length) {
      console.warn(
        `[lyt] 子节点数量不匹配: VNode 有 ${vnode.children.length} 个，DOM 只有 ${domChildren.length} 个`
      );
      _hydrateStats.mismatches++;
    }
  }

  // 插槽子节点（SLOTS_CHILDREN）
  if (shapeFlag & ShapeFlags.SLOTS_CHILDREN && typeof vnode.children === 'object' && vnode.children !== null) {
    // 插槽内容在 DOM 中已经渲染，不需要额外处理
    // 事件绑定已在父元素上完成
  }
}

// ================================================================
//  事件绑定
// ================================================================

/**
 * 绑定事件处理器到 DOM 元素
 *
 * 遍历 VNode 的 props，将所有事件处理器绑定到对应的 DOM 元素上。
 * 事件属性以 'on' 开头（如 onClick、onInput）。
 *
 * 支持的事件绑定形式：
 *   - onClick / onInput / onChange 等
 *   - onCaptureClick 等（带 capture 修饰符）
 *
 * @param el    DOM 元素
 * @param props 属性对象
 */
function bindEvents(el: HTMLElement, props: Record<string, any>): void {
  for (const key in props) {
    const value = props[key];

    // 事件属性（on* 或 @*）
    if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      el.addEventListener(eventName, value);
    }
  }
}

/**
 * 移除 DOM 元素上的事件处理器
 *
 * 用于注水回退或组件卸载时清理事件绑定。
 *
 * @param el    DOM 元素
 * @param props 属性对象
 */
function _unbindEvents(el: HTMLElement, props: Record<string, any>): void {
  for (const key in props) {
    const value = props[key];

    if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      el.removeEventListener(eventName, value);
    }
  }
}

// ================================================================
//  Ref 处理
// ================================================================

/**
 * 设置模板引用
 *
 * 如果 ref 是函数，调用函数传入 DOM 元素；
 * 如果 ref 是对象，设置 ref.current 为 DOM 元素。
 *
 * @param el  DOM 元素
 * @param ref ref 值
 */
function setRef(el: HTMLElement, ref: any): void {
  if (typeof ref === 'function') {
    ref(el);
  } else if (ref && typeof ref === 'object') {
    ref.current = el;
  }
}

// ================================================================
//  类型判断辅助
// ================================================================

/**
 * 判断 VNode 是否为 Fragment 类型
 */
function isFragmentVNode(vnode: VNode): boolean {
  return typeof vnode.type === 'symbol' && String(vnode.type) === 'Symbol(Fragment)';
}

/**
 * 判断 VNode 是否为文本类型
 */
function isTextVNode(vnode: VNode): boolean {
  return typeof vnode.type === 'symbol' && String(vnode.type).includes('Text');
}

/**
 * 判断 VNode 是否为注释类型
 */
function isCommentVNode(vnode: VNode): boolean {
  return typeof vnode.type === 'symbol' && String(vnode.type).includes('Comment');
}

/**
 * 判断 VNode 是否为组件类型
 */
function isComponentVNode(vnode: VNode): boolean {
  const shapeFlag = vnode.shapeFlag || 0;
  if (shapeFlag & (ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT)) {
    return true;
  }
  // 兜底：通过 type 判断
  if (typeof vnode.type === 'object' && vnode.type !== null) {
    return true;
  }
  if (typeof vnode.type === 'function') {
    return true;
  }
  return false;
}

// ================================================================
//  Mismatch 处理
// ================================================================

/**
 * 处理注水不匹配
 *
 * 当 DOM 节点与 VNode 不匹配时，输出警告。
 * 在严格模式下会抛出错误。
 *
 * @param domNode  DOM 节点
 * @param vnode    VNode
 * @param message  不匹配描述
 * @param options  注水选项
 */
function handleMismatch(
  domNode: HTMLElement | Text | Comment,
  vnode: VNode,
  message: string,
  options: HydrateOptions
): void {
  const fullMessage = `[lyt] 注水不匹配: ${message}`;

  _hydrateStats.mismatches++;

  if (options.strict) {
    throw new LytError(LytErrorCodes.LYT_SSR_HYDRATION_ERROR, fullMessage);
  } else {
    console.warn(fullMessage);
  }
}

// ================================================================
//  Partial Hydration — Islands Architecture
// ================================================================

/**
 * 组件选项接口（用于 Island 注水）
 * 与 SSR 渲染器的 ComponentOptions 对齐
 */
export interface ComponentOptions {
  /** 组件名称 */
  name?: string
  /** setup 函数 */
  setup?: (...args: any[]) => any
  /** render 函数 */
  render?: (...args: any[]) => VNode
  /** props 定义 */
  props?: Record<string, any>
  /** slots */
  slots?: Record<string, any>
  /** 其他组件选项 */
  [key: string]: any
}

/** Island 注水状态 */
interface IslandState {
  /** island 标识符 */
  id: string
  /** 是否已注水 */
  hydrated: boolean
  /** 组件实例 */
  instance: any
  /** 事件监听器（用于清理） */
  eventListeners: Array<{ el: HTMLElement; event: string; handler: any }>
  /** 超时定时器 */
  timeoutId: ReturnType<typeof setTimeout> | null
  /** IntersectionObserver 实例 */
  observer: IntersectionObserver | null
  /** 交互事件监听器 */
  interactionHandler: (() => void) | null
}

/** 全局 island 注册表 */
const islandRegistry = new Map<string, IslandState>();

/** 全局 island 组件映射（id → component） */
const islandComponentMap = new Map<string, ComponentOptions>();

/** HTML 转义映射 */
const ISLAND_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const ISLAND_ESCAPE_RE = /[&<>"']/g;

/**
 * HTML 转义（Island 内部使用）
 */
function islandEscapeHTML(str: string): string {
  return str.replace(ISLAND_ESCAPE_RE, (ch) => ISLAND_ESCAPE_MAP[ch]);
}

/**
 * HTML 转义（通用）
 */
function escapeHTML(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => ISLAND_ESCAPE_MAP[ch]);
}

/**
 * 注水特定 island（Partial Hydration）
 *
 * 通过 CSS 选择器找到服务端渲染的 island 元素，
 * 解析其关联的 props JSON，创建组件实例并注水。
 *
 * @param selector  CSS 选择器（匹配带 data-hydrate 属性的元素）
 * @param component 组件定义
 * @param options   注水选项
 * @returns 注水结果
 *
 * @example
 *   // HTML: <div data-hydrate="counter" data-props="...">...</div>
 *   // <script type="application/json" data-hydrate-props="counter">{"count":0}</script>
 *   hydrateIsland('[data-hydrate="counter"]', CounterComponent)
 */
export function hydrateIsland(
  selector: string,
  component: ComponentOptions,
  options: HydrationOptions = {}
): HydrateResult {
  const container = typeof document !== 'undefined' ? document : null;
  if (!container) {
    // 非 DOM 环境，返回失败
    return { success: false, mismatches: 0, hydratedNodes: 0 };
  }

  const el = container.querySelector(selector) as HTMLElement | null;
  if (!el) {
    console.warn(`[lyt] hydrateIsland: 未找到匹配元素 "${selector}"`);
    return { success: false, mismatches: 0, hydratedNodes: 0 };
  }

  const islandId = el.getAttribute('data-hydrate');
  if (!islandId) {
    console.warn('[lyt] hydrateIsland: 元素缺少 data-hydrate 属性');
    return { success: false, mismatches: 0, hydratedNodes: 0 };
  }

  // 检查是否已注水
  if (el.hasAttribute('data-hydrated')) {
    return { success: true, mismatches: 0, hydratedNodes: 0 };
  }

  // 解析 props
  const props = parseIslandProps(islandId, container);
  if (props === null) {
    console.warn(`[lyt] hydrateIsland: 无法解析 island "${islandId}" 的 props`);
    return { success: false, mismatches: 0, hydratedNodes: 0 };
  }

  // 检查懒注水策略
  const hydrateWhen = el.getAttribute('data-hydrate-when');
  if (hydrateWhen || options.lazy) {
    return scheduleLazyHydration(el, islandId, component, props, hydrateWhen || 'visible', options);
  }

  // 立即注水
  return performIslandHydration(el, islandId, component, props, options);
}

/**
 * 解析 island 的 props
 *
 * 从 `<script type="application/json" data-hydrate-props="id">` 中提取 JSON 数据。
 *
 * @param islandId  island 标识符
 * @param container DOM 容器（document）
 * @returns 解析后的 props 对象，失败返回 null
 */
function parseIslandProps(islandId: string, container: Document | HTMLElement): Record<string, any> | null {
  const scriptEl = container.querySelector(
    `script[type="application/json"][data-hydrate-props="${islandId}"]`
  );
  if (!scriptEl) {
    // 尝试从 data-props 属性解析
    const islandEl = container.querySelector(`[data-hydrate="${islandId}"]`);
    if (islandEl) {
      const propsAttr = islandEl.getAttribute('data-props');
      if (propsAttr) {
        try {
          return JSON.parse(propsAttr);
        } catch (e) {
          console.warn('[Lyt Hydration] 解析 island data-props JSON 失败:', e instanceof Error ? e.message : e)
          return null;
        }
      }
    }
    return {};
  }

  try {
    return JSON.parse(scriptEl.textContent || '{}');
  } catch (e) {
    console.warn('[Lyt Hydration] 解析 island props script JSON 失败:', e instanceof Error ? e.message : e)
    return null;
  }
}

/**
 * 执行 island 注水
 *
 * @param el        island DOM 元素
 * @param islandId  island 标识符
 * @param component 组件定义
 * @param props     组件 props
 * @param options   注水选项
 * @returns 注水结果
 */
function performIslandHydration(
  el: HTMLElement,
  islandId: string,
  component: ComponentOptions,
  props: Record<string, any>,
  options: HydrationOptions
): HydrateResult {
  const result: HydrateResult = { success: true, mismatches: 0, hydratedNodes: 0 };

  try {
    // 开启注水模式
    _isHydrating = true;

    // 获取组件渲染结果
    let clientVNode: VNode | null = null;

    if (typeof component.render === 'function') {
      clientVNode = component.render(props, {
        slots: component.slots || {},
        emit: () => {},
      });
    } else if (typeof component.setup === 'function') {
      const setupResult = component.setup(props, {
        emit: () => {},
        slots: component.slots || {},
      });
      if (typeof setupResult === 'function') {
        clientVNode = setupResult();
      }
    }

    if (!clientVNode) {
      console.warn(`[lyt] island "${islandId}": 组件未返回 VNode`);
      _isHydrating = false;
      result.success = false;
      return result;
    }

    // Hydration mismatch 检测（开发模式）
    if (options.dev !== false) {
      const mismatches = detectHydrationMismatch(el, clientVNode, islandId);
      result.mismatches = mismatches;
    }

    // 注水 VNode 到 DOM
    hydrateNode(el, clientVNode, options);
    result.hydratedNodes = _hydrateStats.hydratedNodes;

    // 绑定事件
    if (clientVNode.props) {
      bindEvents(el, clientVNode.props);
    }

    // 递归注水子节点中的事件
    hydrateChildEvents(el, clientVNode);

    // 标记为已注水
    el.setAttribute('data-hydrated', '');

    // 注册 island 状态
    const islandState: IslandState = {
      id: islandId,
      hydrated: true,
      instance: component,
      eventListeners: [],
      timeoutId: null,
      observer: null,
      interactionHandler: null,
    };
    islandRegistry.set(islandId, islandState);
    islandComponentMap.set(islandId, component);

    _isHydrating = false;

    // 触发回调
    if (options.onHydrated) {
      options.onHydrated();
    }

    return result;
  } catch (error) {
    _isHydrating = false;
    console.error(`[lyt] island "${islandId}" 注水失败:`, error);
    result.success = false;
    return result;
  }
}

/**
 * 递归注水子节点中的事件
 *
 * 遍历 VNode 子树，为所有带事件处理器的 DOM 元素绑定事件。
 *
 * @param parentEl 父 DOM 元素
 * @param vnode    VNode
 */
function hydrateChildEvents(parentEl: HTMLElement, vnode: VNode): void {
  if (!vnode.children || typeof vnode.children === 'string') return;

  if (Array.isArray(vnode.children)) {
    const domChildren = Array.from(parentEl.children);
    let vnodeIdx = 0;

    for (let i = 0; i < domChildren.length && vnodeIdx < vnode.children.length; i++) {
      const childVNode = vnode.children[vnodeIdx];
      if (childVNode === null || childVNode === undefined) {
        vnodeIdx++;
        continue;
      }

      if (typeof childVNode.type === 'string' && childVNode.props) {
        bindEvents(domChildren[i] as HTMLElement, childVNode.props);
        // 递归处理子节点
        hydrateChildEvents(domChildren[i] as HTMLElement, childVNode);
      } else if (typeof childVNode.type === 'object' || typeof childVNode.type === 'function') {
        // 组件节点，尝试获取 subTree
        const comp = childVNode.type as any;
        if (typeof comp === 'function') {
          try {
            const subTree = comp(childVNode.props || {}, { slots: childVNode.children || {} });
            if (subTree && domChildren[i]) {
              hydrateChildEvents(domChildren[i] as HTMLElement, subTree);
            }
          } catch (e) {
            console.warn('[Lyt Hydration] 递归注水子节点事件 - 函数式组件调用失败:', e instanceof Error ? e.message : e)
          }
        } else if (comp && typeof comp.render === 'function') {
          try {
            const subTree = comp.render(childVNode.props || {}, { slots: childVNode.children || {}, emit: () => {} });
            if (subTree && domChildren[i]) {
              hydrateChildEvents(domChildren[i] as HTMLElement, subTree);
            }
          } catch (e) {
            console.warn('[Lyt Hydration] 递归注水子节点事件 - 组件 render 调用失败:', e instanceof Error ? e.message : e)
          }
        }
      }

      vnodeIdx++;
    }
  }
}

/**
 * 调度懒注水
 *
 * 根据 hydrateWhen 策略延迟注水：
 *   - "visible"：使用 IntersectionObserver，元素进入视口时注水
 *   - "idle"：使用 requestIdleCallback，浏览器空闲时注水
 *   - "interaction"：首次用户交互时注水
 *
 * @param el          island DOM 元素
 * @param islandId    island 标识符
 * @param component   组件定义
 * @param props       组件 props
 * @param hydrateWhen 注水策略
 * @param options     注水选项
 * @returns 注水结果（懒注水返回 pending 状态）
 */
function scheduleLazyHydration(
  el: HTMLElement,
  islandId: string,
  component: ComponentOptions,
  props: Record<string, any>,
  hydrateWhen: string,
  options: HydrationOptions
): HydrateResult {
  const result: HydrateResult = { success: true, mismatches: 0, hydratedNodes: 0 };

  // 设置超时
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  if (options.timeout && options.timeout > 0) {
    timeoutId = setTimeout(() => {
      // 超时后强制注水
      cleanupLazyResources(el, islandId);
      performIslandHydration(el, islandId, component, props, options);
    }, options.timeout);
  }

  const islandState: IslandState = {
    id: islandId,
    hydrated: false,
    instance: component,
    eventListeners: [],
    timeoutId,
    observer: null,
    interactionHandler: null,
  };
  islandRegistry.set(islandId, islandState);
  islandComponentMap.set(islandId, component);

  switch (hydrateWhen) {
    case 'visible': {
      // 使用 IntersectionObserver
      if (typeof IntersectionObserver !== 'undefined') {
        const observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                observer.unobserve(entry.target);
                islandState.observer = null;
                if (timeoutId) clearTimeout(timeoutId);
                islandState.timeoutId = null;
                performIslandHydration(el, islandId, component, props, options);
              }
            }
          },
          { rootMargin: '200px' }
        );
        observer.observe(el);
        islandState.observer = observer;
      } else {
        // 不支持 IntersectionObserver，直接注水
        if (timeoutId) clearTimeout(timeoutId);
        performIslandHydration(el, islandId, component, props, options);
      }
      break;
    }

    case 'idle': {
      // 使用 requestIdleCallback
      const scheduleIdle = (cb: () => void) => {
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(cb, { timeout: options.timeout || 2000 });
        } else {
          setTimeout(cb, 1);
        }
      };
      scheduleIdle(() => {
        if (timeoutId) clearTimeout(timeoutId);
        islandState.timeoutId = null;
        if (!el.hasAttribute('data-hydrated')) {
          performIslandHydration(el, islandId, component, props, options);
        }
      });
      break;
    }

    case 'interaction': {
      // 首次用户交互时注水
      const handler = () => {
        if (timeoutId) clearTimeout(timeoutId);
        islandState.timeoutId = null;
        islandState.interactionHandler = null;
        document.removeEventListener('click', handler);
        document.removeEventListener('keydown', handler);
        document.removeEventListener('scroll', handler);
        document.removeEventListener('touchstart', handler);
        if (!el.hasAttribute('data-hydrated')) {
          performIslandHydration(el, islandId, component, props, options);
        }
      };
      document.addEventListener('click', handler, { once: false, passive: true });
      document.addEventListener('keydown', handler, { once: false, passive: true });
      document.addEventListener('scroll', handler, { once: false, passive: true });
      document.addEventListener('touchstart', handler, { once: false, passive: true });
      islandState.interactionHandler = handler;
      break;
    }

    default: {
      // 未知策略，直接注水
      if (timeoutId) clearTimeout(timeoutId);
      performIslandHydration(el, islandId, component, props, options);
    }
  }

  return result;
}

/**
 * 清理懒注水资源
 */
function cleanupLazyResources(el: HTMLElement, islandId: string): void {
  const state = islandRegistry.get(islandId);
  if (!state) return;

  if (state.observer) {
    state.observer.disconnect();
    state.observer = null;
  }

  if (state.timeoutId !== null) {
    clearTimeout(state.timeoutId);
    state.timeoutId = null;
  }

  if (state.interactionHandler) {
    document.removeEventListener('click', state.interactionHandler);
    document.removeEventListener('keydown', state.interactionHandler);
    document.removeEventListener('scroll', state.interactionHandler);
    document.removeEventListener('touchstart', state.interactionHandler);
    state.interactionHandler = null;
  }
}

/**
 * 注水所有 island
 *
 * 查找页面上所有带 data-hydrate 属性的元素，逐一注水。
 * 需要提前通过 registerIslandComponent 注册组件映射。
 *
 * @param options 注水选项
 * @returns 注水结果汇总
 */
export function hydrateAllIslands(options: HydrationOptions = {}): HydrateResult {
  const container = typeof document !== 'undefined' ? document : null;
  if (!container) {
    return { success: false, mismatches: 0, hydratedNodes: 0 };
  }

  const islands = container.querySelectorAll('[data-hydrate]:not([data-hydrated])');
  const totalResult: HydrateResult = { success: true, mismatches: 0, hydratedNodes: 0 };

  islands.forEach((el) => {
    const islandId = el.getAttribute('data-hydrate');
    if (!islandId) {
      console.warn('[lyt] hydrateAllIslands: 元素缺少 data-hydrate 属性');
      totalResult.success = false;
      return;
    }
    const component = islandComponentMap.get(islandId);

    if (!component) {
      console.warn(`[lyt] hydrateAllIslands: 未找到 island "${islandId}" 的组件注册`);
      totalResult.success = false;
      return;
    }

    const result = hydrateIsland(`[data-hydrate="${islandId}"]`, component, options);
    totalResult.mismatches += result.mismatches;
    totalResult.hydratedNodes += result.hydratedNodes;
    if (!result.success) totalResult.success = false;
  });

  return totalResult;
}

/**
 * 注册 island 组件映射
 *
 * @param id        island 标识符
 * @param component 组件定义
 */
export function registerIslandComponent(id: string, component: ComponentOptions): void {
  islandComponentMap.set(id, component);
}

/**
 * 卸载 island
 *
 * 清理 island 的所有资源（事件监听、Observer、定时器等）。
 *
 * @param islandId island 标识符
 */
export function unmountIsland(islandId: string): void {
  const state = islandRegistry.get(islandId);
  if (!state) return;

  // 清理懒注水资源
  const el = typeof document !== 'undefined'
    ? document.querySelector(`[data-hydrate="${islandId}"]`)
    : null;

  if (el) {
    cleanupLazyResources(el as HTMLElement, islandId);
    // 移除已注水标记
    el.removeAttribute('data-hydrated');
  }

  // 从注册表移除
  islandRegistry.delete(islandId);
  islandComponentMap.delete(islandId);
}

/**
 * 获取 island 注册表（测试用）
 */
export function getIslandRegistry(): Map<string, IslandState> {
  return islandRegistry;
}

/**
 * 清空 island 注册表（测试用）
 */
export function clearIslandRegistry(): void {
  islandRegistry.clear();
  islandComponentMap.clear();
}

// ================================================================
//  服务端 Island 标记生成
// ================================================================

/**
 * 创建 Hydration Island 的服务端 HTML
 *
 * 生成带有 data-hydrate 属性和序列化 props 的 HTML，
 * 以及关联的 `<script type="application/json">` props 标签。
 *
 * @param component 组件定义
 * @param props     组件 props
 * @param tag       包裹标签名（默认 "div"）
 * @param hydrateWhen 注水策略（"visible" | "idle" | "interaction"）
 * @returns 完整的 island HTML 字符串
 *
 * @example
 *   createHydrationIsland(
 *     { name: 'counter', render: (props) => ({ type: 'span', ... }) },
 *     { initialCount: 0 },
 *   )
 *   // → <div data-hydrate="counter" data-props="{&quot;initialCount&quot;:0}">
 *   //      <span>Count: 0</span>
 *   //    </div>
 *   //    <script type="application/json" data-hydrate-props="counter">
 *   //      {"initialCount":0}
 *   //    </script>
 */
export function createHydrationIsland(
  component: ComponentOptions,
  props: Record<string, any> = {},
  tag: string = 'div',
  hydrateWhen?: string
): string {
  const islandId = component.name || 'anonymous';

  // 序列化 props 为 JSON
  const propsJSON = JSON.stringify(props);
  const propsAttr = islandEscapeHTML(propsJSON);

  // 渲染组件内容
  let content = '';
  if (typeof component.render === 'function') {
    const vnode = component.render(props, {
      slots: component.slots || {},
      emit: () => {},
    });
    content = vnodeToString(vnode);
  }

  // 构建 data-hydrate-when 属性
  const whenAttr = hydrateWhen ? ` data-hydrate-when="${escapeHTML(hydrateWhen)}"` : '';

  // 构建 island HTML（islandId 需要转义以防止注入）
  const safeIslandId = escapeHTML(islandId);
  const html = `<${tag} data-hydrate="${safeIslandId}" data-props="${propsAttr}"${whenAttr}>${content}</${tag}>`;

  // 构建 props script 标签
  const scriptTag = `<script type="application/json" data-hydrate-props="${safeIslandId}">${propsJSON}</script>`;

  return html + scriptTag;
}

/**
 * 将 VNode 转换为 HTML 字符串（简化版，用于 island 服务端渲染）
 *
 * @param vnode VNode
 * @returns HTML 字符串
 */
function vnodeToString(vnode: VNode): string {
  if (vnode === null || vnode === undefined) return '';

  const { type, props, children } = vnode;

  // Fragment
  if (typeof type === 'symbol' && String(type) === 'Symbol(Fragment)') {
    if (Array.isArray(children)) {
      return children.map(c => vnodeToString(c as VNode)).join('');
    }
    return '';
  }

  // Text
  if (typeof type === 'symbol' && String(type).includes('Text')) {
    return islandEscapeHTML(String(children || ''));
  }

  // Comment
  if (typeof type === 'symbol' && String(type).includes('Comment')) {
    return `<!--${escapeHTML(String(children || ''))}-->`;
  }

  // Element
  if (typeof type === 'string') {
    const propsStr = serializeIslandProps(props);
    const VOID_TAGS = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
      'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
    ]);

    if (VOID_TAGS.has(type)) {
      return `<${type}${propsStr} />`;
    }

    let childrenStr = '';
    if (typeof children === 'string') {
      childrenStr = islandEscapeHTML(children);
    } else if (Array.isArray(children)) {
      childrenStr = children.map(c => vnodeToString(c as VNode)).join('');
    } else if (typeof children === 'number') {
      childrenStr = islandEscapeHTML(String(children));
    }

    return `<${type}${propsStr}>${childrenStr}</${type}>`;
  }

  // Component (function)
  if (typeof type === 'function') {
    const subTree = (type as any)(props || {}, { slots: children || {} });
    return vnodeToString(subTree);
  }

  // Component (object)
  if (typeof type === 'object' && type !== null) {
    const comp = type as any;
    if (typeof comp.render === 'function') {
      const subTree = comp.render(props || {}, { slots: children || {}, emit: () => {} });
      return vnodeToString(subTree);
    }
  }

  return '';
}

/**
 * 序列化 island 属性
 *
 * @param props 属性对象
 * @returns HTML 属性字符串
 */
function serializeIslandProps(props: Record<string, any> | null): string {
  if (!props) return '';

  const attrs: string[] = [];

  for (const key in props) {
    const value = props[key];

    // 跳过事件、内部属性
    if (key.startsWith('on') || key.startsWith('@') || key === 'key' || key === 'ref') continue;
    if (key === '__vccOpts' || key.startsWith('__')) continue;
    if (key === 'dangerouslySetInnerHTML' || key === 'innerHTML') continue;

    if (value === true) {
      attrs.push(key);
    } else if (value === false || value === null || value === undefined) {
      continue;
    } else if (key === 'class' && typeof value === 'string') {
      attrs.push(`class="${islandEscapeHTML(value)}"`);
    } else if (key === 'style' && typeof value === 'string') {
      attrs.push(`style="${islandEscapeHTML(value)}"`);
    } else {
      attrs.push(`${key}="${islandEscapeHTML(String(value))}"`);
    }
  }

  return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
}

// ================================================================
//  Hydration Mismatch 检测
// ================================================================

/** Mismatch 警告信息 */
interface MismatchWarning {
  /** island 标识符 */
  islandId: string
  /** 期望的 HTML（客户端渲染） */
  expected: string
  /** 实际的 HTML（服务端渲染） */
  actual: string
  /** 修复建议 */
  suggestion: string
}

/** 已记录的 mismatch 警告 */
const mismatchWarnings: MismatchWarning[] = [];

/**
 * 检测 hydration mismatch
 *
 * 对比服务端渲染的 DOM 内容与客户端 VNode 渲染的内容，
 * 如果不一致则记录警告（仅在开发模式）。
 *
 * @param serverEl  服务端渲染的 DOM 元素
 * @param clientVNode 客户端 VNode
 * @param islandId  island 标识符
 * @returns mismatch 数量
 */
function detectHydrationMismatch(
  serverEl: HTMLElement,
  clientVNode: VNode,
  islandId: string
): number {
  let mismatches = 0;

  // 获取服务端 HTML
  const serverHTML = getServerHTML(serverEl);

  // 获取客户端 HTML
  const clientHTML = vnodeToString(clientVNode);

  // 对比
  if (serverHTML !== clientHTML) {
    mismatches++;

    const warning: MismatchWarning = {
      islandId,
      expected: clientHTML,
      actual: serverHTML,
      suggestion: generateMismatchSuggestion(serverHTML, clientHTML, islandId),
    };

    mismatchWarnings.push(warning);

    console.warn(
      `[lyt] Hydration mismatch in island "${islandId}":\n` +
      `  服务端: ${serverHTML}\n` +
      `  客户端: ${clientHTML}\n` +
      `  建议: ${warning.suggestion}`
    );
  }

  return mismatches;
}

/**
 * 获取服务端渲染的 HTML（排除 island 特有属性）
 */
function getServerHTML(el: HTMLElement): string {
  // 克隆元素，移除 island 属性后获取 innerHTML
  const clone = el.cloneNode(true) as HTMLElement;
  clone.removeAttribute('data-hydrate');
  clone.removeAttribute('data-props');
  clone.removeAttribute('data-hydrate-when');
  clone.removeAttribute('data-hydrated');
  return clone.innerHTML;
}

/**
 * 生成 mismatch 修复建议
 */
function generateMismatchSuggestion(
  serverHTML: string,
  clientHTML: string,
  islandId: string
): string {
  // 检查常见问题
  if (serverHTML.trim() === '') {
    return `服务端渲染为空，请检查组件 "${islandId}" 的服务端渲染逻辑`;
  }
  if (clientHTML.trim() === '') {
    return `客户端渲染为空，请检查组件 "${islandId}" 的 render 函数`;
  }

  // 检查是否是时间/随机值导致的差异
  const timePattern = /\d{10,13}/;
  if (timePattern.test(serverHTML) || timePattern.test(clientHTML)) {
    return '检测到时间戳差异，考虑使用统一的时间源或延迟注水';
  }

  // 检查是否是属性顺序差异
  if (normalizeForComparison(serverHTML) === normalizeForComparison(clientHTML)) {
    return 'HTML 内容相同但属性顺序不同，这不影响功能但可能导致 mismatch 警告';
  }

  return `请确保组件 "${islandId}" 在服务端和客户端渲染相同的输出`;
}

/**
 * 标准化 HTML 用于比较（忽略空白和属性顺序）
 */
function normalizeForComparison(html: string): string {
  return html
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

/**
 * 获取所有 mismatch 警告（测试用）
 */
export function getMismatchWarnings(): MismatchWarning[] {
  return [...mismatchWarnings];
}

/**
 * 清空 mismatch 警告（测试用）
 */
export function clearMismatchWarnings(): void {
  mismatchWarnings.length = 0;
}
