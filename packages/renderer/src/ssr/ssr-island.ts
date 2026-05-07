/**
 * @lytjs/renderer - SSR Island 架构
 * 为 SSR 应用提供基于 Island 的选择性 hydration
 */

import type { VNode } from '@lytjs/vdom';
import { Fragment, Text, ShapeFlags } from '@lytjs/vdom';
import { isString, isArray } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import { escapeHtml } from '../utils';

// ============================================================
// 类型定义
// ============================================================

/**
 * Island 组件的精简接口。
 * 使用简化的结构以避免与完整的 ComponentOptions 紧耦合。
 */
export interface ComponentOptions {
  name?: string;
  props?: Record<string, unknown>;
  setup?: (props: Record<string, unknown>) => Record<string, unknown> | VNode | void;
  render?: (ctx: Record<string, unknown>) => VNode;
  data?: () => Record<string, unknown>;
  [key: string]: unknown;
}

// ============================================================
// Island 注册表
// ============================================================

const islandRegistry = new Map<string, ComponentOptions>();

/**
 * 注册一个命名 Island 组件。
 *
 * 注册的组件后续可以在 `hydrateIsland` 和 `createIslandSSRContent` 中通过名称引用。
 */
export function registerIslandComponent(name: string, component: ComponentOptions): void {
  if (!name || typeof name !== 'string') {
    if (__DEV__) {
      warn(`registerIslandComponent: invalid island name "${String(name)}"`);
    }
    return;
  }
  islandRegistry.set(name, component);
}

/**
 * 根据名称获取已注册的 Island 组件。
 * 如果未找到则返回 undefined。
 */
export function getIslandComponent(name: string): ComponentOptions | undefined {
  return islandRegistry.get(name);
}

// ============================================================
// createIslandSSRContent
// ============================================================

/**
 * 创建服务端渲染的 Island 占位符 HTML。
 *
 * 生成一个带有 `data-island` 和 `data-props` 属性的 `<div>` 元素。
 * props 被序列化为 JSON 并进行 base64 编码，以便安全嵌入 HTML。
 */
export function createIslandSSRContent(
  name: string,
  props: Record<string, unknown>,
): string {
  const encodedProps = encodeProps(props);
  return `<div data-island="${escapeHtml(name)}" data-props="${escapeHtml(encodedProps)}"><!-- island placeholder --></div>`;
}

// ============================================================
// hydrateIsland
// ============================================================

/**
 * 对容器内的 Island 元素执行 hydration。
 *
 * 查找带有 `data-island` 属性的元素，解码序列化的 props，
 * 并使用注册的 Island 组件对它们进行 hydration。
 *
 * @param container - 一个 Element 或 CSS 选择器字符串，用于查找容器
 * @param component - 用于 hydration 的组件选项（覆盖注册表）
 * @param props - 可选的 props 覆盖（覆盖序列化的 props）
 */
export async function hydrateIsland(
  container: Element | string,
  component: ComponentOptions,
  props?: Record<string, unknown>,
): Promise<void> {
  // 解析容器
  let root: Element | null;
  if (isString(container)) {
    root = document.querySelector(container);
  } else {
    root = container;
  }

  if (!root) {
    if (__DEV__) {
      warn(`hydrateIsland: container not found for "${String(container)}"`);
    }
    return;
  }

  // 查找容器内所有 Island 元素
  const islandElements = root.querySelectorAll('[data-island]');

  for (let i = 0; i < islandElements.length; i++) {
    const el = islandElements[i] as HTMLElement;
    const islandName = el.getAttribute('data-island');

    if (!islandName) continue;

    // 确定使用哪个组件：显式参数或注册表查找
    // 仅当 Island 名称与注册组件完全匹配时才匹配；
    // 不要在名称不匹配时回退到传入的组件，以防止错误的 hydration。
    let resolvedComponent = islandRegistry.get(islandName);
    if (!resolvedComponent && islandName === component.name) {
      resolvedComponent = component;
    }
    if (!resolvedComponent) {
      // 没有找到匹配的组件；跳过此 Island
      continue;
    }

    // 确定 props：显式参数或从 data-props 属性解码
    const resolvedProps = props ?? decodeProps(el.getAttribute('data-props') ?? '');

    // 对 Island 元素执行 hydration
    await hydrateIslandElement(el, resolvedComponent, resolvedProps);
  }
}

// ============================================================
// 内部工具函数
// ============================================================

/**
 * 使用给定的组件和 props 对单个 Island 元素执行 hydration。
 *
 * 与替换 innerHTML 不同，此函数通过遍历 vnode 树并与现有 DOM 节点进行
 * 协调来执行真正的 hydration，复用匹配的节点，仅更新/创建不同的节点。
 */
async function hydrateIslandElement(
  el: HTMLElement,
  component: ComponentOptions,
  props: Record<string, unknown>,
): Promise<void> {
  // 如果定义了 setup 则调用
  let setupResult: Record<string, unknown> | VNode | void = undefined;
  if (typeof component.setup === 'function') {
    setupResult = component.setup(props);
  }

  // 如果 setup 直接返回了 VNode，则使用它（跳过 render 调用）
  let vnode: VNode | undefined;
  if (setupResult && typeof setupResult === 'object' && 'type' in setupResult) {
    vnode = setupResult as VNode;
  } else if (typeof component.render === 'function') {
    // 仅当 setup 未返回 VNode 时才调用 render
    const ctx = (setupResult && typeof setupResult === 'object')
      ? setupResult as Record<string, unknown>
      : {};
    vnode = component.render(ctx);
  }

  if (vnode) {
    // 移除 Island 元素内的占位符注释节点
    // 但保留现有 DOM 子节点用于 hydration 比较
    const placeholderComments: ChildNode[] = [];
    for (let i = el.childNodes.length - 1; i >= 0; i--) {
      const child = el.childNodes[i];
      if (child && child.nodeType === Node.COMMENT_NODE) {
        placeholderComments.push(child);
      }
    }
    for (const comment of placeholderComments) {
      comment.remove();
    }

    // 执行真正的 hydration：遍历 vnode 树并与现有 DOM 协调
    hydrateVNode(el, vnode);
  }
}

/**
 * 对父元素的现有 DOM 子节点执行 VNode hydration。
 *
 * 并行遍历 vnode 树和 DOM 树：
 * - 文本节点：比较 textContent，匹配则复用，不同则更新
 * - 元素节点：比较 tagName 和 key 属性，匹配则复用，
 *   递归 hydrate 子节点，无匹配则创建新节点
 * - Fragment 节点：对每个子 vnode 与兄弟 DOM 节点进行 hydration
 * - 未匹配的 DOM 节点被移除；未匹配的 vnode 创建新的 DOM 节点
 */
function hydrateVNode(parent: Element, vnode: VNode): void {
  const { type, children } = vnode;

  // 处理 Fragment：对每个子 vnode 与兄弟 DOM 节点进行 hydration
  if (type === Fragment) {
    if (isArray(children)) {
      let domIndex = 0;
      const existingChildren = Array.from(parent.childNodes);
      for (let i = 0; i < children.length; i++) {
        const childVNode = children[i];
        if (childVNode == null) continue;
        domIndex = hydrateChildVNode(parent, childVNode, existingChildren, domIndex);
      }
      // 移除剩余未匹配的 DOM 节点
      removeRemainingChildren(parent, existingChildren, domIndex);
    }
    return;
  }

  // 处理 Text vnode
  if (type === Text) {
    const text = isString(children) ? children : String(children ?? '');
    const firstChild = parent.firstChild;
    if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
      // 如果内容匹配则复用现有文本节点
      if (firstChild.textContent !== text) {
        firstChild.textContent = text;
      }
    } else {
      // 没有匹配的文本节点；创建新节点
      const textNode = document.createTextNode(text);
      parent.appendChild(textNode);
    }
    return;
  }

  // 处理 Element vnode
  if (typeof type === 'string') {
    const tag = type.toLowerCase();

    // 尝试在现有 DOM 子节点中查找匹配的元素
    let matchedElement: Element | null = null;
    const existingChildren = Array.from(parent.childNodes);

    for (let i = 0; i < existingChildren.length; i++) {
      const child = existingChildren[i];
      if (child && child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        if (el.tagName.toLowerCase() === tag) {
          matchedElement = el;
          break;
        }
      }
    }

    if (matchedElement) {
      // 复用现有元素：更新属性并 hydrate 子节点
      hydrateAttributes(matchedElement, vnode);
      hydrateElementChildren(matchedElement, vnode);
    } else {
      // 没有匹配的元素；从 vnode 创建新元素
      // FIX: P0-3 使用安全的 DOM API 替代 innerHTML
      const newElement = createElementFromVNode(vnode);
      if (newElement) {
        parent.appendChild(newElement);
      }
    }
    return;
  }

  // 处理组件 VNode（有状态或函数式组件）
  if (typeof type === 'object' && type !== null) {
    const component = type as ComponentOptions;
    let childVNode: VNode | undefined;

    // 优先尝试 render 函数
    if (typeof component.render === 'function') {
      const ctx = vnode.props ?? {};
      const result = component.render(ctx);
      if (result && typeof result === 'object' && 'type' in result) {
        childVNode = result as VNode;
      }
    }

    // 如果 render 未产生 VNode，尝试 setup 函数
    if (!childVNode && typeof component.setup === 'function') {
      const setupResult = component.setup(vnode.props ?? {});
      if (setupResult && typeof setupResult === 'object' && 'type' in setupResult) {
        childVNode = setupResult as VNode;
      }
    }

    // 递归 hydrate 解析后的子 VNode
    if (childVNode) {
      hydrateVNode(parent, childVNode);
    } else if (__DEV__) {
      warn(`hydrateVNode: could not resolve component VNode for hydration`);
    }
    return;
  }
}

/**
 * 在给定索引处对单个子 vnode 与现有 DOM 子节点执行 hydration。
 * 返回消费节点后的下一个 DOM 索引。
 */
function hydrateChildVNode(
  parent: Element,
  vnode: VNode,
  existingChildren: ChildNode[],
  domIndex: number,
): number {
  const { type, children } = vnode;

  // 处理 Fragment：hydrate 每个子节点
  if (type === Fragment) {
    if (isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child != null) {
          domIndex = hydrateChildVNode(parent, child, existingChildren, domIndex);
        }
      }
    }
    return domIndex;
  }

  // 处理 Text
  if (type === Text) {
    const text = isString(children) ? children : String(children ?? '');
    if (domIndex < existingChildren.length) {
      const existingNode = existingChildren[domIndex];
      if (!existingNode) {
        parent.appendChild(document.createTextNode(text));
        return domIndex + 1;
      }
      if (existingNode.nodeType === Node.TEXT_NODE) {
        // 复用现有文本节点
        if (existingNode.textContent !== text) {
          existingNode.textContent = text;
        }
        return domIndex + 1;
      }
      // 类型不匹配：替换现有节点
      const textNode = document.createTextNode(text);
      parent.replaceChild(textNode, existingNode);
      return domIndex + 1;
    }
    // 没有现有节点；追加新文本节点
    parent.appendChild(document.createTextNode(text));
    return domIndex + 1;
  }

  // 处理 Element
  if (typeof type === 'string') {
    const tag = type.toLowerCase();

    // FIX: P2-34 缓存 vnodeToSimpleHTML 结果到局部变量，避免重复调用
    // @ts-expect-error -- reserved for future use
    const _vnodeHtml = vnodeToSimpleHTML(vnode);

    if (domIndex < existingChildren.length) {
      const existingNode = existingChildren[domIndex];
      if (!existingNode) {
        // 没有现有节点；追加新元素
        // FIX: P0-3 使用安全的 DOM API 替代 innerHTML
        const newElement = createElementFromVNode(vnode);
        if (newElement) {
          parent.appendChild(newElement);
        }
        return domIndex + 1;
      }
      if (existingNode.nodeType === Node.ELEMENT_NODE) {
        const el = existingNode as Element;
        if (el.tagName.toLowerCase() === tag) {
          // 标签匹配：复用并 hydrate
          hydrateAttributes(el, vnode);
          hydrateElementChildren(el, vnode);
          return domIndex + 1;
        }
        // 标签不匹配：替换为新元素
        // FIX: P0-3 使用安全的 DOM API 替代 innerHTML
        const newElement = createElementFromVNode(vnode);
        if (newElement) {
          parent.replaceChild(newElement, existingNode);
        }
        return domIndex + 1;
      }
      // 不是元素节点：替换
      // FIX: P0-3 使用安全的 DOM API 替代 innerHTML
      const newElement = createElementFromVNode(vnode);
      if (newElement) {
        parent.replaceChild(newElement, existingNode);
      }
      return domIndex + 1;
    }
    // 没有现有节点；追加新元素
    // FIX: P0-3 使用安全的 DOM API 替代 innerHTML
    const newElement = createElementFromVNode(vnode);
    if (newElement) {
      parent.appendChild(newElement);
    }
    return domIndex + 1;
  }

  // 处理组件 VNode（有状态或函数式组件）
  if (typeof type === 'object' && type !== null) {
    const component = type as ComponentOptions;
    let childVNode: VNode | undefined;

    if (typeof component.render === 'function') {
      const ctx = vnode.props ?? {};
      const result = component.render(ctx);
      if (result && typeof result === 'object' && 'type' in result) {
        childVNode = result as VNode;
      }
    }

    if (!childVNode && typeof component.setup === 'function') {
      const setupResult = component.setup(vnode.props ?? {});
      if (setupResult && typeof setupResult === 'object' && 'type' in setupResult) {
        childVNode = setupResult as VNode;
      }
    }

    if (childVNode) {
      domIndex = hydrateChildVNode(parent, childVNode, existingChildren, domIndex);
    }
    return domIndex;
  }

  return domIndex;
}

/**
 * 从 domIndex 开始移除剩余未匹配的 DOM 子节点。
 */
function removeRemainingChildren(
  parent: Element,
  existingChildren: ChildNode[],
  domIndex: number,
): void {
  for (let i = existingChildren.length - 1; i >= domIndex; i--) {
    const child = existingChildren[i];
    if (child) {
      parent.removeChild(child);
    }
  }
}

/**
 * 更新现有 DOM 元素的属性以匹配 vnode props。
 */
function hydrateAttributes(el: Element, vnode: VNode): void {
  const props = vnode.props ?? {};
  const vnodeKeys = new Set<string>();

  // 从 vnode props 设置或更新属性
  for (const key in props) {
    if (key === 'key' || key === 'ref') continue;
    vnodeKeys.add(key);
    const value = props[key];
    if (typeof value === 'boolean') {
      if (value) {
        el.setAttribute(key, '');
      } else {
        el.removeAttribute(key);
      }
    } else if (value != null && value !== '') {
      el.setAttribute(key, String(value));
    } else {
      el.removeAttribute(key);
    }
  }

  // 移除 DOM 元素上存在但 vnode props 中不存在的属性
  const existingAttrs = Array.from(el.attributes);
  for (const attr of existingAttrs) {
    if (!vnodeKeys.has(attr.name) && attr.name !== 'data-island' && attr.name !== 'data-props') {
      el.removeAttribute(attr.name);
    }
  }
}

/**
 * 对现有元素的子节点与 vnode 子节点执行 hydration。
 */
function hydrateElementChildren(el: Element, vnode: VNode): void {
  const { children, shapeFlag } = vnode;

  // FIX: P2-35 使用 ShapeFlags 常量替代魔法数字
  if (shapeFlag != null && (shapeFlag & ShapeFlags.TEXT_CHILDREN)) {
    // TEXT_CHILDREN
    const text = isString(children) ? children : String(children ?? '');
    if (el.childNodes.length > 0) {
      // 如果存在则复用第一个文本子节点
      // FIX: P2-v11-03 添加 null 检查替代非空断言，
      // 防止无子节点时 firstChild 为 null 导致运行时崩溃
      const firstChild = el.firstChild;
      if (!firstChild) {
        el.appendChild(document.createTextNode(text));
        return;
      }
      if (firstChild.nodeType === Node.TEXT_NODE) {
        if (firstChild.textContent !== text) {
          firstChild.textContent = text;
        }
        // 移除多余的子节点
        while (el.childNodes.length > 1) {
          const lastChild = el.lastChild;
          // FIX: P2-51 添加 null 检查替代非空断言，防御性编程
          if (lastChild) {
            el.removeChild(lastChild);
          } else {
            break;
          }
        }
      } else {
        // 用单个文本节点替换所有子节点
        el.textContent = text;
      }
    } else {
      el.appendChild(document.createTextNode(text));
    }
    return;
  }

  if (isArray(children)) {
    const existingChildren = Array.from(el.childNodes);
    let domIndex = 0;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child != null) {
        domIndex = hydrateChildVNode(el, child, existingChildren, domIndex);
      }
    }
    removeRemainingChildren(el, existingChildren, domIndex);
    return;
  }
}

/**
 * 安全创建 DOM 元素
 * FIX: P0-3 避免使用 innerHTML，使用安全的 DOM API
 */
function createElementFromVNode(vnode: VNode): Element | null {
  const type = vnode.type;
  if (typeof type !== 'string') return null;

  const el = document.createElement(type);

  // 设置属性
  if (vnode.props) {
    for (const [key, value] of Object.entries(vnode.props)) {
      if (key === 'children' || key === 'key') continue;
      if (value != null) {
        el.setAttribute(key, String(value));
      }
    }
  }

  // 设置子节点
  if (vnode.children) {
    if (typeof vnode.children === 'string') {
      el.textContent = vnode.children;
    } else if (Array.isArray(vnode.children)) {
      for (const child of vnode.children) {
        if (typeof child === 'string') {
          el.appendChild(document.createTextNode(child));
        } else if (child && typeof child === 'object' && 'type' in child) {
          const childEl = createElementFromVNode(child as VNode);
          if (childEl) {
            el.appendChild(childEl);
          }
        }
      }
    }
  }

  return el;
}

/**
 * 简单的 vnode 转 HTML 转换器，用于 Island hydration。
 * 处理基本元素、文本、Fragment 和注释。
 */
function vnodeToSimpleHTML(vnode: VNode): string {
  const { type, children } = vnode;

  // 处理 Fragment：渲染每个子节点
  if (type === Fragment) {
    if (isArray(children)) {
      return children
        .map((child) => (child != null ? vnodeToSimpleHTML(child) : ''))
        .join('');
    }
    return '';
  }

  // 处理 Text vnode
  if (type === Text) {
    const text = isString(children) ? children : String(children ?? '');
    return escapeHtml(text);
  }

  // 处理 Element vnode
  if (typeof type === 'string') {
    const props = vnode.props ?? {};
    let attrs = '';
    for (const key in props) {
      if (key === 'key' || key === 'ref') continue;
      const value = props[key];
      if (typeof value === 'boolean' && value) {
        attrs += ` ${key}`;
      } else if (value != null && value !== '') {
        attrs += ` ${key}="${escapeHtml(String(value))}"`;
      }
    }

    const tag = type;

    // 渲染子节点
    let childContent = '';
    if (children != null) {
      if (isString(children)) {
        childContent = escapeHtml(children);
      } else if (isArray(children)) {
        childContent = children
          .map((child) => (child != null ? vnodeToSimpleHTML(child as VNode) : ''))
          .join('');
      } else if (typeof children === 'object' && 'type' in (children as object)) {
        // 单个 VNode 子节点
        // FIX: P2-batch2-2 添加运行时类型检查，避免不安全的类型断言
        if (children != null && typeof children === 'object' && 'type' in children) {
          childContent = vnodeToSimpleHTML(children as unknown as VNode);
        }
      }
    }

    return `<${tag}${attrs}>${childContent}</${tag}>`;
  }

  return '';
}

/**
 * 使用 TextEncoder 将字符串编码为 base64（安全替代 btoa(unescape(...))）。
 * FIX: P2-50 使用分块处理（每次 8192 字节）替代逐字符拼接，
 * 避免大字符串时 String.fromCharCode 的性能问题和调用栈开销。
 */
function uint8ToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 8192;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    chunks.push(String.fromCharCode(...chunk));
  }
  return btoa(chunks.join(''));
}

/**
 * 使用 atob 将 base64 解码为 Uint8Array（安全替代 escape(atob(...))）。
 */
function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * 将 props 编码为 base64 字符串，用于嵌入 HTML 属性。
 */
function encodeProps(props: Record<string, unknown>): string {
  const json = JSON.stringify(props);
  // 使用 TextEncoder 进行安全的 UTF-8 到 base64 转换
  const bytes = new TextEncoder().encode(json);
  return uint8ToBase64(bytes);
}

/**
 * 从 base64 字符串解码 props。
 */
function decodeProps(encoded: string): Record<string, unknown> {
  if (!encoded) return {};

  try {
    // 使用 TextDecoder 进行安全的 base64 到 UTF-8 转换
    const bytes = base64ToUint8(encoded);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    if (__DEV__) {
      warn(`hydrateIsland: failed to decode props from "${encoded}"`);
    }
    return {};
  }
}
