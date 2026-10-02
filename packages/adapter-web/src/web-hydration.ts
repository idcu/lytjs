/**
 * @lytjs/adapter-web - Hydration
 * 简化的水合逻辑，将现有 DOM 节点与 vnode 匹配。
 *
 * 从 @lytjs/renderer/src/dom/hydration.ts 迁移，
 * 使用 WebRendererHost 的 getChildNodes/getNodeType/getTagName 等方法。
 */

import type { VNode } from '@lytjs/vdom';
import { Fragment, Text, Comment, ShapeFlags } from '@lytjs/vdom';
import { isArray, isFunction } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import { WebRendererHost } from './web-host';
import { patchProp } from './web-patch-props';

// Global dev flag declaration (injected by build tool)
declare const __DEV__: boolean;

// ============================================================
// 组件 ShapeFlag 掩码 / vnode 判定
// ============================================================

/**
 * 有状态 / 函数式组件的 ShapeFlag 掩码。
 *
 * 组件 vnode 的 shapeFlag 由 `@lytjs/vdom` 的 `getShapeFlag()` 给出，恒为
 * `STATEFUL_COMPONENT`(4) —— 该仓的 `isObject()` 把函数也视为对象，
 * 故函数式组件的 type 同样落在这一位（`FUNCTIONAL_COMPONENT`(2) 从未被设置）。
 * 用掩码比较可同时容纳两种语义，避免实现演化后只判断其中一位而漏掉组件。
 */
const COMPONENT_MASK = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT;

/** 判定一个值是否为 vnode（组件 setup/render 的返回值可能是普通 ctx 对象） */
function isVNodeLike(value: unknown): boolean {
  return !!value && typeof value === 'object' && 'type' in (value as object);
}

// ============================================================
// 开发模式水合不匹配警告
// ============================================================

function warnHydrationMismatch(type: string, expected: string, actual: string): void {
  if (__DEV__) {
    warn(
      `Hydration mismatch: expected ${type} "${expected}" but got "${actual}". ` +
        `The DOM has been patched to match the vnode.`,
    );
  }
}

// ============================================================
// 水合类型
// ============================================================

export interface HydrationRenderer {
  hydrate(vnode: VNode, container: HTMLElement): void;
}

// ============================================================
// 水合 Fragment
// FIX: P2-61 将 Fragment 水合逻辑提取为独立函数
// ============================================================

function hydrateFragment(
  vnode: VNode,
  parent: HTMLElement,
  index: number,
  host: WebRendererHost,
): number {
  const { children } = vnode;
  const childArray = isArray(children) ? children : [];
  let currentIndex = index;
  let hasMismatch = false;

  for (let i = 0; i < childArray.length; i++) {
    const child = childArray[i];
    if (child != null) {
      currentIndex = hydrateNode(child, parent, currentIndex, host);
    }
  }

  // Fragment el points to the first child's el.
  if (childArray.length > 0) {
    const childNodes = host.getChildNodes(parent);
    const firstChild = childNodes[index] ?? null;
    if (firstChild && childArray[0] && childArray[0].el === firstChild) {
      vnode.el = firstChild;
    } else if (childArray[0] && childArray[0].el) {
      vnode.el = childArray[0].el as Node;
      hasMismatch = true;
    } else {
      vnode.el = null;
    }
  } else {
    vnode.el = null;
  }

  if (hasMismatch && __DEV__) {
    warn(
      `Hydration mismatch in Fragment: some children could not be matched. ` +
        `The DOM has been patched to match the vnode.`,
    );
  }

  return currentIndex;
}

// ============================================================
// 水合 Text
// FIX: P2-61 将 Text 水合逻辑提取为独立函数
// ============================================================

function hydrateText(
  vnode: VNode,
  parent: HTMLElement,
  index: number,
  host: WebRendererHost,
): number {
  const { children } = vnode;
  const childNodes = host.getChildNodes(parent);
  const node = childNodes[index];

  if (isFunction(children)) {
    if (__DEV__) {
      warn(
        `Hydration: Text VNode children is a function, which is not supported during hydration. ` +
          `The function will be replaced with an empty string.`,
      );
    }
  }

  const text = isFunction(children) ? '' : String(children ?? '');

  if (node && host.getNodeType(node) === Node.TEXT_NODE) {
    // 匹配：复用现有文本节点
    if ((node as Text).textContent !== text) {
      warnHydrationMismatch('text content', text, (node as Text).textContent ?? '');
      (node as Text).textContent = text;
    }
    vnode.el = node;
  } else {
    // Mismatch: create new text node and replace
    warnHydrationMismatch(
      'node type',
      `Text("${text}")`,
      node && host.getNodeType(node) === Node.ELEMENT_NODE
        ? `Element(<${host.getTagName(node as Element)}>)`
        : node
          ? `Node(type=${host.getNodeType(node)})`
          : 'none',
    );
    const newNode = host.createText(text);
    if (node) {
      host.replaceChild(parent, newNode, node);
    } else {
      host.insert(newNode, parent);
    }
    vnode.el = newNode;
  }

  return index + 1;
}

// ============================================================
// 水合 Comment
// FIX: P2-61 将 Comment 水合逻辑提取为独立函数
// ============================================================

function hydrateComment(
  vnode: VNode,
  parent: HTMLElement,
  index: number,
  host: WebRendererHost,
): number {
  const { children } = vnode;
  const childNodes = host.getChildNodes(parent);
  const node = childNodes[index];
  const text = isFunction(children) ? '' : String(children ?? '');

  if (node && host.getNodeType(node) === Node.COMMENT_NODE) {
    // Match: reuse existing comment node
    if ((node as Comment).textContent !== text) {
      warnHydrationMismatch('comment content', text, (node as Comment).textContent ?? '');
      (node as Comment).textContent = text;
    }
    vnode.el = node;
  } else {
    // 不匹配：创建新注释节点并替换
    warnHydrationMismatch(
      'node type',
      `Comment("${text}")`,
      node
        ? host.getNodeType(node) === Node.TEXT_NODE
          ? `Text("${(node as Text).textContent}")`
          : `Element(<${host.getTagName(node as Element)}>)`
        : 'none',
    );
    const newNode = host.createComment(text);
    if (node) {
      host.replaceChild(parent, newNode, node);
    } else {
      host.insert(newNode, parent);
    }
    vnode.el = newNode;
  }

  return index + 1;
}

// ============================================================
// Hydrate Element (matched case)
// FIX: P2-61 将 Element 匹配成功的水合逻辑提取为独立函数
// ============================================================

function hydrateMatchedElement(vnode: VNode, existingNode: Node, host: WebRendererHost): number {
  const { shapeFlag, children, props } = vnode;
  vnode.el = existingNode as Element;

  // Hydrate props (attach event listeners, sync attributes)
  // FIX: P1-16 使用可选链替代非空断言
  const isSVG = host.getNamespaceURI?.(existingNode as Element) === 'http://www.w3.org/2000/svg';
  const vnodeProps = props ?? {};
  // FIX: P2-v11-36 使用 Object.keys 替代 for...in，
  // 避免遍历到原型链上的属性
  for (const key of Object.keys(vnodeProps)) {
    if (key === 'key' || key === 'ref') continue;
    patchProp(existingNode as Element, key, null, vnodeProps[key], isSVG);
  }

  // 水合子节点
  let childIndex = 0;
  if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child != null) {
        childIndex = hydrateNode(child, existingNode as HTMLElement, childIndex, host);
      }
    }
  } else if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    const text = String(children ?? '');
    const elChildren = host.getChildNodes(existingNode as Element);
    const firstChild = elChildren[0];
    if (firstChild && host.getNodeType(firstChild) === Node.TEXT_NODE) {
      if ((firstChild as Text).textContent !== text) {
        (firstChild as Text).textContent = text;
      }
    } else {
      (existingNode as HTMLElement).textContent = text;
    }
    childIndex = 1;
  }

  // Remove extra DOM nodes (iterate from end to avoid stale references)
  const elChildren = host.getChildNodes(existingNode as Element);
  while (elChildren.length > childIndex) {
    host.remove(elChildren[elChildren.length - 1]!);
    elChildren.pop();
  }

  return childIndex;
}

// ============================================================
// Hydrate Element (mismatch case)
// FIX: P2-61 将 Element 不匹配时的水合逻辑提取为独立函数
// ============================================================

function hydrateMismatchedElement(
  vnode: VNode,
  parent: HTMLElement,
  existingNode: Node | undefined,
  host: WebRendererHost,
): void {
  const { type, shapeFlag, children, props } = vnode;
  const tag = type as string;

  warnHydrationMismatch(
    'element tag',
    `<${tag}>`,
    existingNode ? `<${host.getTagName(existingNode as Element)}>` : 'none',
  );

  // FIX: P1-16 使用可选链替代非空断言
  const parentNamespace = host.getNamespaceURI?.(parent);
  const isSVG = tag === 'svg' || parentNamespace === 'http://www.w3.org/2000/svg';
  const newEl = host.createElement(tag, isSVG);
  vnode.el = newEl;

  // 挂载 props
  const vnodeProps = props ?? {};
  // FIX: P2-v11-36 使用 Object.keys 替代 for...in
  for (const key of Object.keys(vnodeProps)) {
    if (key === 'key' || key === 'ref') continue;
    patchProp(newEl, key, null, vnodeProps[key], isSVG);
  }

  // Mount children
  if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child != null) {
        hydrateNode(child, newEl as HTMLElement, i, host);
      }
    }
  } else if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    host.setElementText(newEl, String(children ?? ''));
  }

  // 替换或追加
  if (existingNode) {
    host.replaceChild(parent, newEl, existingNode);
  } else {
    host.insert(newEl, parent);
  }
}

// ============================================================
// Hydrate Element
// FIX: P2-61 将 Element 水合逻辑提取为独立函数
// ============================================================

function hydrateElement(
  vnode: VNode,
  parent: HTMLElement,
  index: number,
  host: WebRendererHost,
): number {
  const { type } = vnode;
  // FIX: DTS build error - shapeFlag 未使用
  // const { shapeFlag } = vnode;
  const tag = type as string;
  const childNodes = host.getChildNodes(parent);
  const existingNode = childNodes[index];

  if (
    existingNode &&
    host.getNodeType(existingNode) === Node.ELEMENT_NODE &&
    host.getTagName(existingNode as Element) === tag.toLowerCase()
  ) {
    // 匹配：复用现有元素
    hydrateMatchedElement(vnode, existingNode, host);
  } else {
    // Mismatch: create new element and replace
    hydrateMismatchedElement(vnode, parent, existingNode, host);
  }

  return index + 1;
}

// ============================================================
// 水合组件
// FIX: 组件 vnode 此前被静默跳过（详见下方注释）
// ============================================================

/**
 * 水合组件 vnode。
 *
 * ⚠️ 2026-10-02 修复：此前 `hydrateNode` 在 `shapeFlag & ShapeFlags.ELEMENT`
 * 之后**没有组件分支** ⇒ 组件 vnode（shapeFlag=4）一律落到
 * `warn('Hydration: unrecognized node type, skipping.')` 并被跳过：
 * SSR 出的 DOM 既不复用也不更新、`vnode.el` 恒为 null（已用探针实测确认）。
 *
 * 解析顺序与 `@lytjs/renderer` 的 `renderToString`（`renderComponentToString`）
 * 保持一致：先 `setup(props)`，其返回若本身是 vnode（含 `type`）则直接使用，
 * 若为普通对象则作为 ctx 传给 `render`；无 setup 时用 `props` 作 ctx。
 *
 * 组件不产生属于自己的 DOM 节点 —— 其渲染产物占据组件 vnode 自身的位置，
 * 故解析出子 vnode 后**以同一 index 递归水合**（Fragment 多根时由
 * `hydrateFragment` 自行推进 index）。
 */
function hydrateComponent(
  vnode: VNode,
  parent: HTMLElement,
  index: number,
  host: WebRendererHost,
): number {
  const component = vnode.type as unknown;
  let childVNode: VNode | undefined;

  if (component && typeof component === 'object') {
    const options = component as { setup?: unknown; render?: unknown };
    let ctx: Record<string, unknown> = (vnode.props ?? {}) as Record<string, unknown>;

    if (isFunction(options.setup)) {
      const setupResult = (options.setup as (p: unknown) => unknown)(vnode.props ?? {});
      if (isVNodeLike(setupResult)) {
        childVNode = setupResult as VNode;
      } else if (setupResult && typeof setupResult === 'object') {
        ctx = setupResult as Record<string, unknown>;
      }
    }

    if (!childVNode && isFunction(options.render)) {
      const result = (options.render as (c: unknown) => unknown)(ctx);
      if (isVNodeLike(result)) childVNode = result as VNode;
    }
  }

  if (!childVNode) {
    if (__DEV__) warn('Hydration: could not resolve component vnode, skipping.');
    return index + 1;
  }

  const nextIndex = hydrateNode(childVNode, parent, index, host);
  // 组件 vnode 的 el 指向其子树根节点，与元素 vnode 的 el 语义保持一致
  // （元素 vnode 在 hydrateMatchedElement 中同样会回填 el）
  vnode.el = childVNode.el ?? null;
  return nextIndex;
}

// ============================================================
// hydrateNode - core recursive hydration
// FIX: P2-61 将 hydrateNode 重构为分发函数，具体逻辑委托给子函数
// ============================================================

function hydrateNode(
  vnode: VNode,
  parent: HTMLElement,
  index: number,
  host: WebRendererHost,
): number {
  const { type, shapeFlag } = vnode;

  // 处理 Fragment
  if (type === Fragment) {
    return hydrateFragment(vnode, parent, index, host);
  }

  // Handle Text
  if (type === Text) {
    return hydrateText(vnode, parent, index, host);
  }

  // 处理 Comment
  if (type === Comment) {
    return hydrateComment(vnode, parent, index, host);
  }

  // 处理 Element
  if (shapeFlag & ShapeFlags.ELEMENT) {
    return hydrateElement(vnode, parent, index, host);
  }

  // 处理组件（有状态 / 函数式）
  // FIX: 2026-10-02 补组件分支，此前组件 vnode 会被下方的 warn 静默跳过
  if (shapeFlag & COMPONENT_MASK) {
    return hydrateComponent(vnode, parent, index, host);
  }

  if (__DEV__) {
    warn(`Hydration: unrecognized node type, skipping.`);
  }

  return index + 1;
}

// ============================================================
// createHydrationFunctions
// ============================================================

/**
 * 创建水合函数，用于将现有 DOM 与 vnode 匹配。
 *
 * @param _rendererOptions - 保留用于未来渲染器配置（当前未使用）
 * @param sharedVnodeMap - 可选的共享 vnodeMap，使水合和 DOM 渲染器使用同一映射
 */
export function createHydrationFunctions(
  _rendererOptions: Record<string, unknown>,
  sharedVnodeMap?: WeakMap<Element, VNode | null>,
): HydrationRenderer {
  const host = new WebRendererHost();
  const vnodeMap = sharedVnodeMap ?? new WeakMap<Element, VNode | null>();

  function hydrate(vnode: VNode, container: HTMLElement): void {
    hydrateNode(vnode, container, 0, host);
    vnodeMap.set(container, vnode);
  }

  return { hydrate };
}
