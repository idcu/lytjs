/**
 * @lytjs/renderer - SSR Island Architecture
 * Provides island-based selective hydration for SSR applications
 */

import type { VNode } from '@lytjs/vdom';
import { Fragment, Text, ShapeFlags } from '@lytjs/vdom';
import { isString, isArray } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import { escapeHtml } from '../utils';

// ============================================================
// Types
// ============================================================

/**
 * Minimal component options interface for island components.
 * Uses a simplified shape to avoid tight coupling with the full ComponentOptions.
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
// Island Registry
// ============================================================

const islandRegistry = new Map<string, ComponentOptions>();

/**
 * Register a named island component.
 *
 * Registered components can later be referenced by name in `hydrateIsland`
 * and `createIslandSSRContent`.
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
 * Get a registered island component by name.
 * Returns undefined if not found.
 */
export function getIslandComponent(name: string): ComponentOptions | undefined {
  return islandRegistry.get(name);
}

// ============================================================
// createIslandSSRContent
// ============================================================

/**
 * Create server-side rendered island placeholder HTML.
 *
 * Generates a `<div>` element with `data-island` and `data-props` attributes.
 * The props are serialized as JSON and base64-encoded for safe embedding in HTML.
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
 * Hydrate an island element within a container.
 *
 * Finds elements with `data-island` attribute, decodes the serialized props,
 * and hydrates them using the registered island component.
 *
 * @param container - An Element or CSS selector string to find the container
 * @param component - The component options to hydrate with (overrides registry)
 * @param props - Optional props override (overrides serialized props)
 */
export async function hydrateIsland(
  container: Element | string,
  component: ComponentOptions,
  props?: Record<string, unknown>,
): Promise<void> {
  // Resolve container
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

  // Find all island elements within the container
  const islandElements = root.querySelectorAll('[data-island]');

  for (let i = 0; i < islandElements.length; i++) {
    const el = islandElements[i] as HTMLElement;
    const islandName = el.getAttribute('data-island');

    if (!islandName) continue;

    // Determine which component to use: explicit parameter or registry lookup
    // Only match if the island name exactly matches a registered component;
    // do NOT fall back to the passed component on mismatch to prevent wrong hydration.
    let resolvedComponent = islandRegistry.get(islandName);
    if (!resolvedComponent && islandName === component.name) {
      resolvedComponent = component;
    }
    if (!resolvedComponent) {
      // No matching component found for this island; skip it
      continue;
    }

    // Determine props: explicit parameter or decode from data-props attribute
    const resolvedProps = props ?? decodeProps(el.getAttribute('data-props') ?? '');

    // Hydrate the island element
    await hydrateIslandElement(el, resolvedComponent, resolvedProps);
  }
}

// ============================================================
// Internal helpers
// ============================================================

/**
 * Hydrate a single island element with the given component and props.
 *
 * Instead of replacing innerHTML, this performs true hydration by walking
 * the vnode tree and reconciling it against the existing DOM nodes, reusing
 * nodes that match and only updating/creating nodes that differ.
 */
async function hydrateIslandElement(
  el: HTMLElement,
  component: ComponentOptions,
  props: Record<string, unknown>,
): Promise<void> {
  // Call setup if defined
  let setupResult: Record<string, unknown> | VNode | void = undefined;
  if (typeof component.setup === 'function') {
    setupResult = component.setup(props);
  }

  // If setup returned a VNode directly, use it (skip render call)
  let vnode: VNode | undefined;
  if (setupResult && typeof setupResult === 'object' && 'type' in setupResult) {
    vnode = setupResult as VNode;
  } else if (typeof component.render === 'function') {
    // Only call render when setup did not return a VNode
    const ctx = (setupResult && typeof setupResult === 'object')
      ? setupResult as Record<string, unknown>
      : {};
    vnode = component.render(ctx);
  }

  if (vnode) {
    // Remove the placeholder comment node(s) inside the island element
    // but keep any existing DOM children for hydration comparison
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

    // Perform true hydration: walk vnode tree and reconcile with existing DOM
    hydrateVNode(el, vnode);
  }
}

/**
 * Hydrate a VNode against existing DOM children of a parent element.
 *
 * Walks the vnode tree and the DOM tree in parallel:
 * - Text nodes: compare textContent, reuse if matching, update if different
 * - Element nodes: compare tagName and key attributes, reuse if matching,
 *   recursively hydrate children, create new nodes if no match
 * - Fragment nodes: hydrate each child vnode against sibling DOM nodes
 * - Unmatched DOM nodes are removed; unmatched vnodes create new DOM nodes
 */
function hydrateVNode(parent: Element, vnode: VNode): void {
  const { type, children } = vnode;

  // Handle Fragment: hydrate each child vnode against sibling DOM nodes
  if (type === Fragment) {
    if (isArray(children)) {
      let domIndex = 0;
      const existingChildren = Array.from(parent.childNodes);
      for (let i = 0; i < children.length; i++) {
        const childVNode = children[i];
        if (childVNode == null) continue;
        domIndex = hydrateChildVNode(parent, childVNode, existingChildren, domIndex);
      }
      // Remove any remaining unmatched DOM nodes
      removeRemainingChildren(parent, existingChildren, domIndex);
    }
    return;
  }

  // Handle Text vnode
  if (type === Text) {
    const text = isString(children) ? children : String(children ?? '');
    const firstChild = parent.firstChild;
    if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
      // Reuse existing text node if content matches
      if (firstChild.textContent !== text) {
        firstChild.textContent = text;
      }
    } else {
      // No matching text node; create a new one
      const textNode = document.createTextNode(text);
      parent.appendChild(textNode);
    }
    return;
  }

  // Handle Element vnode
  if (typeof type === 'string') {
    const tag = type.toLowerCase();

    // Try to find a matching element among existing DOM children
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
      // Reuse existing element: update attributes and hydrate children
      hydrateAttributes(matchedElement, vnode);
      hydrateElementChildren(matchedElement, vnode);
    } else {
      // No matching element; create a new one from the vnode
      const html = vnodeToSimpleHTML(vnode);
      const template = document.createElement('template');
      template.innerHTML = html;
      const newElement = template.content.firstChild;
      if (newElement) {
        parent.appendChild(newElement);
      }
    }
    return;
  }

  // Handle component VNode (stateful or functional component)
  if (typeof type === 'object' && type !== null) {
    const component = type as ComponentOptions;
    let childVNode: VNode | undefined;

    // Try render function first
    if (typeof component.render === 'function') {
      const ctx = vnode.props ?? {};
      const result = component.render(ctx);
      if (result && typeof result === 'object' && 'type' in result) {
        childVNode = result as VNode;
      }
    }

    // Try setup function if render didn't produce a VNode
    if (!childVNode && typeof component.setup === 'function') {
      const setupResult = component.setup(vnode.props ?? {});
      if (setupResult && typeof setupResult === 'object' && 'type' in setupResult) {
        childVNode = setupResult as VNode;
      }
    }

    // Recursively hydrate the resolved child VNode
    if (childVNode) {
      hydrateVNode(parent, childVNode);
    } else if (__DEV__) {
      warn(`hydrateVNode: could not resolve component VNode for hydration`);
    }
    return;
  }
}

/**
 * Hydrate a single child vnode against existing DOM children at a given index.
 * Returns the next DOM index after consuming nodes.
 */
function hydrateChildVNode(
  parent: Element,
  vnode: VNode,
  existingChildren: ChildNode[],
  domIndex: number,
): number {
  const { type, children } = vnode;

  // Handle Fragment: hydrate each child
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

  // Handle Text
  if (type === Text) {
    const text = isString(children) ? children : String(children ?? '');
    if (domIndex < existingChildren.length) {
      const existingNode = existingChildren[domIndex];
      if (!existingNode) {
        parent.appendChild(document.createTextNode(text));
        return domIndex + 1;
      }
      if (existingNode.nodeType === Node.TEXT_NODE) {
        // Reuse existing text node
        if (existingNode.textContent !== text) {
          existingNode.textContent = text;
        }
        return domIndex + 1;
      }
      // Type mismatch: replace the existing node
      const textNode = document.createTextNode(text);
      parent.replaceChild(textNode, existingNode);
      return domIndex + 1;
    }
    // No existing node; append new text node
    parent.appendChild(document.createTextNode(text));
    return domIndex + 1;
  }

  // Handle Element
  if (typeof type === 'string') {
    const tag = type.toLowerCase();

    // FIX: P2-34 缓存 vnodeToSimpleHTML 结果到局部变量，避免重复调用
    const vnodeHtml = vnodeToSimpleHTML(vnode);

    if (domIndex < existingChildren.length) {
      const existingNode = existingChildren[domIndex];
      if (!existingNode) {
        // No existing node; append new element
        const template = document.createElement('template');
        template.innerHTML = vnodeHtml;
        const newElement = template.content.firstChild;
        if (newElement) {
          parent.appendChild(newElement);
        }
        return domIndex + 1;
      }
      if (existingNode.nodeType === Node.ELEMENT_NODE) {
        const el = existingNode as Element;
        if (el.tagName.toLowerCase() === tag) {
          // Tag matches: reuse and hydrate
          hydrateAttributes(el, vnode);
          hydrateElementChildren(el, vnode);
          return domIndex + 1;
        }
        // Tag mismatch: replace with new element
        const template = document.createElement('template');
        template.innerHTML = vnodeHtml;
        const newElement = template.content.firstChild;
        if (newElement) {
          parent.replaceChild(newElement, existingNode);
        }
        return domIndex + 1;
      }
      // Not an element node: replace
      const template = document.createElement('template');
      template.innerHTML = vnodeHtml;
      const newElement = template.content.firstChild;
      if (newElement) {
        parent.replaceChild(newElement, existingNode);
      }
      return domIndex + 1;
    }
    // No existing node; append new element
    const template = document.createElement('template');
    template.innerHTML = vnodeHtml;
    const newElement = template.content.firstChild;
    if (newElement) {
      parent.appendChild(newElement);
    }
    return domIndex + 1;
  }

  // Handle component VNode (stateful or functional component)
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
 * Remove remaining unmatched DOM children starting from domIndex.
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
 * Update attributes on an existing DOM element to match the vnode props.
 */
function hydrateAttributes(el: Element, vnode: VNode): void {
  const props = vnode.props ?? {};
  const vnodeKeys = new Set<string>();

  // Set or update attributes from vnode props
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

  // Remove attributes that exist on the DOM element but not in vnode props
  const existingAttrs = Array.from(el.attributes);
  for (const attr of existingAttrs) {
    if (!vnodeKeys.has(attr.name) && attr.name !== 'data-island' && attr.name !== 'data-props') {
      el.removeAttribute(attr.name);
    }
  }
}

/**
 * Hydrate children of an existing element against vnode children.
 */
function hydrateElementChildren(el: Element, vnode: VNode): void {
  const { children, shapeFlag } = vnode;

  // FIX: P2-35 使用 ShapeFlags 常量替代魔法数字
  if (shapeFlag != null && (shapeFlag & ShapeFlags.TEXT_CHILDREN)) {
    // TEXT_CHILDREN
    const text = isString(children) ? children : String(children ?? '');
    if (el.childNodes.length > 0) {
      // Reuse first text child if it exists
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
        // Remove any extra children
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
        // Replace all children with a single text node
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
 * Simple vnode-to-HTML converter for island hydration.
 * Handles basic elements, text, fragments, and comments.
 */
function vnodeToSimpleHTML(vnode: VNode): string {
  const { type, children } = vnode;

  // Handle Fragment: render each child
  if (type === Fragment) {
    if (isArray(children)) {
      return children
        .map((child) => (child != null ? vnodeToSimpleHTML(child) : ''))
        .join('');
    }
    return '';
  }

  // Handle Text vnode
  if (type === Text) {
    const text = isString(children) ? children : String(children ?? '');
    return escapeHtml(text);
  }

  // Handle Element vnode
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

    // Render children
    let childContent = '';
    if (children != null) {
      if (isString(children)) {
        childContent = escapeHtml(children);
      } else if (isArray(children)) {
        childContent = children
          .map((child) => (child != null ? vnodeToSimpleHTML(child as VNode) : ''))
          .join('');
      } else if (typeof children === 'object' && 'type' in (children as object)) {
        // Single VNode child
        // FIX: P2-batch2-2 添加运行时类型检查，避免不安全的类型断言
        if (children != null && typeof children === 'object' && 'type' in children) {
          childContent = vnodeToSimpleHTML(children as VNode);
        }
      }
    }

    return `<${tag}${attrs}>${childContent}</${tag}>`;
  }

  return '';
}

/**
 * Encode a string to base64 using TextEncoder (safe replacement for btoa(unescape(...))).
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
 * Decode base64 to a Uint8Array using atob (safe replacement for escape(atob(...))).
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
 * Encode props to a base64 string for embedding in HTML attributes.
 */
function encodeProps(props: Record<string, unknown>): string {
  const json = JSON.stringify(props);
  // Use TextEncoder for safe UTF-8 to base64 conversion
  const bytes = new TextEncoder().encode(json);
  return uint8ToBase64(bytes);
}

/**
 * Decode props from a base64 string.
 */
function decodeProps(encoded: string): Record<string, unknown> {
  if (!encoded) return {};

  try {
    let json: string;
    // Use TextDecoder for safe base64 to UTF-8 conversion
    const bytes = base64ToUint8(encoded);
    json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    if (__DEV__) {
      warn(`hydrateIsland: failed to decode props from "${encoded}"`);
    }
    return {};
  }
}
