/**
 * Lyt.js Vapor Mode - 渲染器
 *
 * Vapor Mode 绕过虚拟 DOM，直接操作真实 DOM。
 * 每个 VaporNode 代表一个直接的 DOM 绑定关系，
 * 当响应式信号变化时，只更新受影响的 DOM 节点。
 *
 * 核心思想：
 *   - 无 VNode 中间层，直接创建 DOM 元素
 *   - 无 diff 算法，每个绑定精确知道要更新哪个 DOM 节点
 *   - 信号变化时，直接操作对应的 DOM 属性
 */

import type { Signal } from '@lytjs/reactivity/signal';
import type { VaporElement, BindingCleanup } from './vapor-reactive';
import {
  bindText,
  bindProp,
  bindAttr,
  bindClass,
  bindEvent,
  bindIf,
  bindEach,
  bindStyle,
  bindHTML,
} from './vapor-reactive';
import { LytError, LytErrorCodes } from '@lytjs/common';

// ================================================================
//  类型定义
// ================================================================

/** Vapor 绑定类型 */
export type VaporBindingType = 'text' | 'prop' | 'attr' | 'class' | 'style' | 'event'

/** Vapor 绑定描述 */
export interface VaporBinding<T = unknown> {
  /** 绑定类型 */
  type: VaporBindingType
  /** 目标属性名或事件名 */
  target: string
  /** 绑定的响应式信号 */
  signal?: Signal<T>
  /** 计算值表达式 */
  expression?: () => T
}

/** Vapor 节点 — 代表一个直接 DOM 绑定 */
export interface VaporNode {
  /** HTML 标签名 */
  tag: string
  /** 关联的真实 DOM 元素 */
  el?: VaporElement
  /** 子节点 */
  children: VaporNode[]
  /** 静态属性 */
  props: Record<string, unknown>
  /** 事件处理器 */
  events: Record<string, Function>
  /** 响应式绑定列表 */
  bindings: VaporBinding<unknown>[]
  /** 文本内容（静态） */
  text?: string
  /** 节点 key（用于列表渲染） */
  key?: string | number
  /** 内部：绑定清理函数列表（用于 patch 时清理旧绑定） */
  _bindingCleanups?: BindingCleanup[]
}

/** Vapor 挂载容器接口 */
export interface VaporContainer {
  appendChild(child: VaporElement): void
  removeChild(child: VaporElement): void
  childNodes: VaporElement[]
  firstChild: VaporElement | null
}

/** Vapor 组件选项 */
export interface VaporComponentOptions {
  /** 组件名称 */
  name?: string
  /** 初始化函数，返回组件上下文 */
  setup?: () => Record<string, unknown>
  /** 渲染函数，接收上下文和 createElement 函数 */
  render?: (ctx: Record<string, unknown>, h: typeof createVaporElement) => VaporNode | VaporNode[]
  /** 模板字符串（需要编译器） */
  template?: string
  /** 子组件 */
  components?: Record<string, VaporComponentOptions>
  /** 挂载前 */
  beforeMount?: () => void
  /** 挂载后 */
  mounted?: () => void
  /** 卸载前 */
  beforeUnmount?: () => void
  /** 卸载后 */
  unmounted?: () => void
}

/** Vapor App 实例 */
export interface VaporApp {
  /** 挂载到容器 */
  mount(container: VaporContainer | string): void
  /** 卸载 */
  unmount(): void
}

// ================================================================
//  DOM 创建工厂
// ================================================================

/**
 * 创建 DOM 元素
 *
 * 在浏览器环境中使用 document.createElement，
 * 在测试环境中可通过 setVaporDOMFactory 注入自定义实现。
 */
let domFactory: (tag: string) => VaporElement = (tag: string) => {
  // 默认实现：尝试使用全局 document
  if (typeof document !== 'undefined') {
    return document.createElement(tag) as unknown as VaporElement;
  }
  throw new LytError(LytErrorCodes.LYT_RENDERER_VAPOR_ERROR, '未设置 DOM 工厂函数。在非浏览器环境中请调用 setVaporDOMFactory()');
};

/**
 * 设置自定义 DOM 工厂函数（用于测试环境）
 */
export function setVaporDOMFactory(factory: (tag: string) => VaporElement): void {
  domFactory = factory;
}

/**
 * 获取当前 DOM 工厂函数
 */
export function getVaporDOMFactory(): (tag: string) => VaporElement {
  return domFactory;
}

// ================================================================
//  Vapor 元素创建
// ================================================================

/**
 * 创建 Vapor 元素
 *
 * 直接创建 DOM 元素并应用静态属性，不涉及 VNode。
 *
 * @param tag       HTML 标签名
 * @param props     属性对象（可包含信号绑定）
 * @param children  子节点
 * @returns VaporNode
 */
export function createVaporElement(
  tag: string,
  props?: Record<string, unknown>,
  ...children: (VaporNode | string)[]
): VaporNode {
  const node: VaporNode = {
    tag,
    children: [],
    props: {},
    events: {},
    bindings: [],
  };

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith('on') && typeof value === 'function' && !isSignal(value)) {
        // 事件绑定（排除 Signal）
        const eventName = key.slice(2).toLowerCase();
        node.events[eventName] = value;
      } else if (isSignal(value)) {
        // 信号绑定
        if (key === 'textContent' || key === 'text') {
          node.bindings.push({ type: 'text', target: 'textContent', signal: value as Signal<unknown> });
        } else if (key === 'className' || key === 'class') {
          node.bindings.push({ type: 'class', target: 'className', signal: value as Signal<unknown> });
        } else if (key === 'style') {
          node.bindings.push({ type: 'style', target: 'style', signal: value as Signal<unknown> });
        } else {
          node.bindings.push({ type: 'prop', target: key, signal: value as Signal<unknown> });
        }
      } else {
        node.props[key] = value;
      }
    }
  }

  // 处理子节点
  for (const child of children) {
    if (typeof child === 'string') {
      node.children.push({
        tag: '#text',
        children: [],
        props: {},
        events: {},
        bindings: [],
        text: child,
      });
    } else {
      node.children.push(child);
    }
  }

  return node;
}

/**
 * 判断一个值是否是 Signal
 *
 * 通过检查 Signal 的内部特征来识别：
 * - 所有 Signal 都有 _subscribe 方法
 * - WritableSignal 额外有 set 方法
 */
function isSignal(value: unknown): value is Signal<unknown> {
  if (typeof value !== 'function') return false;
  const sig = value as unknown as Record<string, unknown>;
  // 检查 Signal 的核心特征
  return !!(sig._subscribe) || !!(sig.set && sig._subscribe);
}

// ================================================================
//  Vapor 渲染
// ================================================================

/**
 * 将 VaporNode 渲染为真实 DOM 元素
 *
 * 直接创建 DOM 元素树，并建立信号绑定。
 *
 * @param node  VaporNode
 * @returns 渲染后的 DOM 元素
 */
export function renderVaporNode(node: VaporNode): VaporElement {
  if (node.tag === '#text') {
    // 文本节点
    const el = domFactory('#text') as VaporElement;
    el.textContent = node.text || '';
    el.nodeType = 3;
    return el;
  }

  // 创建 DOM 元素
  const el = domFactory(node.tag);
  node.el = el;
  const elRecord = el as Record<string, unknown>;

  // 应用静态属性
  for (const [key, value] of Object.entries(node.props)) {
    if (key === 'style' && typeof value === 'object' && value !== null) {
      for (const [styleKey, styleVal] of Object.entries(value as Record<string, string>)) {
        (elRecord.style as Record<string, string>)[styleKey] = styleVal;
      }
    } else if (key === 'className' || key === 'class') {
      el.className = String(value);
    } else {
      elRecord[key] = value;
    }
  }

  // 追踪所有绑定清理函数，用于后续卸载
  const bindingCleanups: BindingCleanup[] = [];
  for (const binding of node.bindings) {
    if (!binding.signal) continue;
    let cleanup: BindingCleanup;
    if (binding.type === 'text') {
      cleanup = bindText(el, binding.signal);
    } else if (binding.type === 'prop') {
      cleanup = bindProp(el, binding.target, binding.signal);
    } else if (binding.type === 'attr') {
      cleanup = bindAttr(el, binding.target, binding.signal);
    } else if (binding.type === 'class') {
      cleanup = bindClass(el, binding.signal);
    } else if (binding.type === 'style') {
      cleanup = bindStyle(el, binding.signal);
    } else {
      continue;
    }
    bindingCleanups.push(cleanup);
  }
  node._bindingCleanups = bindingCleanups;

  // 绑定事件
  for (const [eventName, handler] of Object.entries(node.events)) {
    bindEvent(el, eventName, handler);
  }

  // 递归渲染子节点
  for (const child of node.children) {
    const childEl = renderVaporNode(child);
    el.appendChild(childEl);
  }

  return el;
}

// ================================================================
//  Vapor Patch（直接 DOM 更新）
// ================================================================

/**
 * Vapor Patch — 直接 DOM 更新，无 VDOM diff
 *
 * 与传统 VDOM patch 不同，Vapor patch 直接操作 DOM：
 *   - 如果 tag 相同，更新属性和绑定
 *   - 如果 tag 不同，替换整个 DOM 元素
 *
 * @param oldNode  旧的 VaporNode
 * @param newNode  新的 VaporNode
 * @param parentEl 父 DOM 元素
 */
export function vaporPatch(
  oldNode: VaporNode,
  newNode: VaporNode,
  parentEl: VaporElement
): void {
  // 如果 tag 不同，直接替换
  if (oldNode.tag !== newNode.tag) {
    const newEl = renderVaporNode(newNode);
    if (oldNode.el && oldNode.el.parentNode === parentEl) {
      parentEl.removeChild(oldNode.el);
    }
    parentEl.appendChild(newEl);
    return;
  }

  // tag 相同，更新属性
  const el = oldNode.el || renderVaporNode(oldNode);
  newNode.el = el;
  const elRecord = el as Record<string, unknown>;

  // 清理旧绑定
  if (oldNode._bindingCleanups) {
    for (const cleanup of oldNode._bindingCleanups) {
      cleanup();
    }
  }

  // 建立新绑定
  const newBindingCleanups: BindingCleanup[] = [];
  for (const binding of newNode.bindings) {
    if (!binding.signal) continue;
    let cleanup: BindingCleanup;
    if (binding.type === 'text') {
      cleanup = bindText(el, binding.signal);
    } else if (binding.type === 'prop') {
      cleanup = bindProp(el, binding.target, binding.signal);
    } else if (binding.type === 'attr') {
      cleanup = bindAttr(el, binding.target, binding.signal);
    } else if (binding.type === 'class') {
      cleanup = bindClass(el, binding.signal);
    } else if (binding.type === 'style') {
      cleanup = bindStyle(el, binding.signal);
    } else {
      continue;
    }
    newBindingCleanups.push(cleanup);
  }
  newNode._bindingCleanups = newBindingCleanups;

  // 更新静态属性
  for (const [key, value] of Object.entries(newNode.props)) {
    if (key === 'style' && typeof value === 'object' && value !== null) {
      for (const [styleKey, styleVal] of Object.entries(value as Record<string, string>)) {
        (elRecord.style as Record<string, string>)[styleKey] = styleVal;
      }
    } else if (key === 'className' || key === 'class') {
      el.className = String(value);
    } else {
      elRecord[key] = value;
    }
  }

  // 更新文本
  if (newNode.text !== undefined) {
    el.textContent = newNode.text;
  }

  // 更新事件
  // 先移除旧事件
  for (const [eventName, handler] of Object.entries(oldNode.events)) {
    if (!newNode.events[eventName]) {
      el.removeEventListener(eventName, handler);
    }
  }
  // 添加新事件
  for (const [eventName, handler] of Object.entries(newNode.events)) {
    if (oldNode.events[eventName] !== handler) {
      if (oldNode.events[eventName]) {
        el.removeEventListener(eventName, oldNode.events[eventName]);
      }
      el.addEventListener(eventName, handler);
    }
  }

  // 更新子节点
  const maxLen = Math.max(oldNode.children.length, newNode.children.length);
  for (let i = 0; i < maxLen; i++) {
    const oldChild = oldNode.children[i];
    const newChild = newNode.children[i];

    if (!oldChild && newChild) {
      // 新增子节点
      const childEl = renderVaporNode(newChild);
      el.appendChild(childEl);
    } else if (oldChild && !newChild) {
      // 删除子节点
      if (oldChild.el && oldChild.el.parentNode === el) {
        el.removeChild(oldChild.el);
      }
    } else if (oldChild && newChild) {
      // 更新子节点
      vaporPatch(oldChild, newChild, el);
    }
  }
}

// ================================================================
//  Vapor 挂载
// ================================================================

/**
 * 使用 Vapor Mode 挂载组件到容器
 *
 * @param container  挂载容器
 * @param component  组件选项
 * @returns 卸载函数
 */
export function vaporMount(
  container: VaporContainer,
  component: VaporComponentOptions
): () => void {
  const ctx = component.setup ? component.setup() : {};

  // 生命周期钩子
  if (component.beforeMount) component.beforeMount();

  // 渲染
  let rootNodes: VaporNode[];
  if (component.render) {
    const result = component.render(ctx, createVaporElement);
    rootNodes = Array.isArray(result) ? result : [result];
  } else {
    rootNodes = [];
  }

  // 将 VaporNode 渲染为 DOM 并挂载
  const elements: VaporElement[] = [];
  const allBindingCleanups: BindingCleanup[] = [];

  for (const node of rootNodes) {
    const el = renderVaporNode(node);
    container.appendChild(el);
    elements.push(el);
    // 收集所有绑定清理函数
    collectBindingCleanups(node, allBindingCleanups);
  }

  if (component.mounted) component.mounted();

  // 返回卸载函数
  return () => {
    if (component.beforeUnmount) component.beforeUnmount();
    // 清理所有 Signal 绑定
    for (const cleanup of allBindingCleanups) {
      cleanup();
    }
    // 移除 DOM 元素
    for (const el of elements) {
      if (el.parentNode === container || (container as unknown as Record<string, unknown>) === el.parentNode) {
        container.removeChild(el);
      }
    }
    if (component.unmounted) component.unmounted();
  };
}

/**
 * 递归收集 VaporNode 树中所有绑定清理函数
 */
function collectBindingCleanups(node: VaporNode, cleanups: BindingCleanup[]): void {
  if (node._bindingCleanups) {
    cleanups.push(...node._bindingCleanups);
  }
  for (const child of node.children) {
    collectBindingCleanups(child, cleanups);
  }
}

// ================================================================
//  导出
// ================================================================

export {
  bindText,
  bindProp,
  bindAttr,
  bindClass,
  bindEvent,
  bindIf,
  bindEach,
  bindStyle,
  bindHTML,
  bindTextCached,
  bindPropCached,
  bindClassCached,
  batchDomUpdate,
};

export type {
  VaporElement,
  BindingCleanup,
};
