/**
 * @lytjs/renderer - SSR Streaming
 * Server-side streaming rendering using Web Streams API
 * FIX: P2-36 使用共享工具函数
 */

import type { VNode } from '@lytjs/vdom';
import { Fragment, Text, Comment, ShapeFlags } from '@lytjs/vdom';
import { isString, isArray, isFunction } from '@lytjs/common-is';
import { escapeHtml, isVoidElement } from '../utils';
import type { SSRInput } from './ssr-renderer';
import {
  isValidHTMLElementTag,
  renderAttributeToString,
  NAMED_ENTITIES,
} from './ssr-utils';

// Re-export NAMED_ENTITIES for backward compatibility
export { NAMED_ENTITIES };

// ============================================================
// SSRStreamOptions
// ============================================================

export interface SSRStreamOptions {
  /** Whether to insert comment markers between chunks (for debugging) */
  commentMarkers?: boolean;
}

// ============================================================
// Suspense detection helpers
// ============================================================

/** ShapeFlag for functional/stateful component (bits 4-5) */
const COMPONENT_MASK = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT;

/** Check if a vnode is a component type (not Fragment/Text/Comment/Element) */
function isComponentVNode(vnode: VNode): boolean {
  return !!(vnode.shapeFlag & COMPONENT_MASK);
}

/** Check if a vnode is a Suspense component by name */
function isSuspenseVNode(vnode: VNode): boolean {
  if (!isComponentVNode(vnode)) return false;
  const type = vnode.type;
  if (typeof type === 'object' && type !== null && 'name' in type) {
    return (type as { name?: string }).name === 'Suspense';
  }
  if (typeof type === 'function' && 'name' in type) {
    return (type as { name?: string }).name === 'Suspense';
  }
  return false;
}

// ============================================================
// renderToStream - main entry (true async streaming)
// ============================================================

/**
 * Render a VNode tree to a ReadableStream of HTML chunks.
 *
 * Each top-level element and component boundary produces a separate chunk,
 * enabling progressive HTML delivery. Suspense boundaries are supported:
 * when an async component is encountered, the fallback is streamed first,
 * then the real content is pushed once resolved.
 *
 * Uses a pull-based approach with microtask scheduling so that each VNode
 * node is enqueued independently, allowing the browser to consume chunks
 * progressively between microtask boundaries.
 */
export function renderToStream(
  input: SSRInput,
  options?: SSRStreamOptions,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const commentMarkers = options?.commentMarkers ?? false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        await streamVNodeAsync(input.vnode, controller, encoder, commentMarkers);
      } catch (err) {
        controller.error(err);
        return;
      }
      controller.close();
    },
  });
}

// ============================================================
// pushChunk - enqueue a single HTML chunk
// ============================================================

function pushChunk(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  html: string,
  commentMarkers: boolean,
  label?: string,
): void {
  if (commentMarkers && label) {
    const marker = `<!-- stream:${label} -->`;
    controller.enqueue(encoder.encode(marker));
  }
  controller.enqueue(encoder.encode(html));
}

// ============================================================
// streamVNodeAsync - async streaming with microtask yielding
// ============================================================

/**
 * Recursively stream a VNode tree with microtask yields between sibling
 * nodes, enabling true progressive delivery.
 */
async function streamVNodeAsync(
  vnode: VNode,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  commentMarkers: boolean,
): Promise<void> {
  const { type, shapeFlag, children } = vnode;

  // Handle Fragment
  if (type === Fragment) {
    await streamFragmentAsync(vnode, controller, encoder, commentMarkers);
    return;
  }

  // Handle Text
  if (type === Text) {
    const text = isFunction(children) ? '' : String(children ?? '');
    pushChunk(controller, encoder, escapeHtml(text), commentMarkers, 'text');
    return;
  }

  // Handle Comment
  if (type === Comment) {
    const text = isFunction(children) ? '' : String(children ?? '');
    let safe = text.replace(/<!--/g, '&lt;!--').replace(/-->/g, '--&gt;');
    safe = safe.replace(/--/g, '- -');
    pushChunk(controller, encoder, `<!--${safe}-->`, commentMarkers, 'comment');
    return;
  }

  // Handle Suspense component
  if (isSuspenseVNode(vnode)) {
    await streamSuspenseBoundary(vnode, controller, encoder, commentMarkers);
    return;
  }

  // Handle Element
  if (shapeFlag & ShapeFlags.ELEMENT) {
    await streamElementAsync(vnode, controller, encoder, commentMarkers);
    return;
  }

  // Handle other component types (stateful/functional)
  if (isComponentVNode(vnode)) {
    await streamComponentAsync(vnode, controller, encoder, commentMarkers);
    return;
  }
}

// ============================================================
// streamFragmentAsync
// ============================================================

async function streamFragmentAsync(
  vnode: VNode,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  commentMarkers: boolean,
): Promise<void> {
  const children = vnode.children;
  if (isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child != null) {
        await streamVNodeAsync(child, controller, encoder, commentMarkers);
        // Yield to the event loop between siblings for true progressive delivery
        await yieldToMicrotask();
      }
    }
  }
}

// ============================================================
// streamSuspenseBoundary - Suspense streaming support
// ============================================================

/**
 * Stream a Suspense boundary:
 * 1. Stream the fallback content immediately
 * 2. Resolve the async children
 * 3. Replace the fallback with the resolved content
 *
 * Uses comment markers to delineate the Suspense boundary so the client
 * can replace the fallback when the real content arrives.
 */
async function streamSuspenseBoundary(
  vnode: VNode,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  commentMarkers: boolean,
): Promise<void> {
  const suspenseId = `suspense-${Math.random().toString(36).slice(2, 8)}`;

  // Open Suspense boundary marker
  pushChunk(controller, encoder, `<!--${suspenseId}-start-->`, commentMarkers, 'suspense:start');

  // Try to resolve the default slot children
  const defaultSlot = vnode.props?.default as (() => unknown) | undefined;
  const fallbackSlot = vnode.props?.fallback as (() => unknown) | undefined;

  // Stream fallback first if available
  if (fallbackSlot) {
    pushChunk(controller, encoder, `<!--${suspenseId}-fallback-start-->`, commentMarkers, 'suspense:fallback');
    try {
      const fallbackResult = fallbackSlot();
      if (isArray(fallbackResult)) {
        for (const child of fallbackResult) {
          if (child != null && typeof child === 'object' && 'type' in child) {
            await streamVNodeAsync(child as VNode, controller, encoder, commentMarkers);
          }
        }
      } else if (fallbackResult != null && typeof fallbackResult === 'object' && 'type' in fallbackResult) {
        await streamVNodeAsync(fallbackResult as VNode, controller, encoder, commentMarkers);
      }
    } catch (_err) {
      // Fallback rendering error: silently skip
    }
    pushChunk(controller, encoder, `<!--${suspenseId}-fallback-end-->`, commentMarkers, 'suspense:fallback-end');
  }

  // Now try to resolve the default (async) content
  if (defaultSlot) {
    try {
      const result = defaultSlot();
      // If the result is a Promise, await it
      const resolved = result instanceof Promise ? await result : result;

      pushChunk(controller, encoder, `<!--${suspenseId}-content-start-->`, commentMarkers, 'suspense:content');

      if (isArray(resolved)) {
        for (const child of resolved) {
          if (child != null && typeof child === 'object' && 'type' in child) {
            await streamVNodeAsync(child as VNode, controller, encoder, commentMarkers);
            await yieldToMicrotask();
          }
        }
      } else if (resolved != null && typeof resolved === 'object' && 'type' in resolved) {
        await streamVNodeAsync(resolved as VNode, controller, encoder, commentMarkers);
      }

      pushChunk(controller, encoder, `<!--${suspenseId}-content-end-->`, commentMarkers, 'suspense:content-end');
    } catch (_err) {
      // Async content failed to resolve; fallback is already streamed
      pushChunk(controller, encoder, `<!--${suspenseId}-error-->`, commentMarkers, 'suspense:error');
    }
  }

  // Close Suspense boundary marker
  pushChunk(controller, encoder, `<!--${suspenseId}-end-->`, commentMarkers, 'suspense:end');
}

// ============================================================
// streamComponentAsync - generic component streaming
// ============================================================

async function streamComponentAsync(
  vnode: VNode,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  commentMarkers: boolean,
): Promise<void> {
  // For component vnodes, try to render them and stream the result
  const component = vnode.type as Record<string, unknown>;
  if (typeof component === 'object' && component !== null) {
    // If the component has a render function, call it
    if (typeof component.render === 'function') {
      const result = component.render(vnode.props ?? {});
      if (result && typeof result === 'object' && 'type' in result) {
        await streamVNodeAsync(result as VNode, controller, encoder, commentMarkers);
        return;
      }
    }
    // If the component has a setup that returns a VNode
    if (typeof component.setup === 'function') {
      const setupResult = component.setup(vnode.props ?? {});
      const resolved = setupResult instanceof Promise ? await setupResult : setupResult;
      if (resolved && typeof resolved === 'object' && 'type' in resolved) {
        await streamVNodeAsync(resolved as VNode, controller, encoder, commentMarkers);
        return;
      }
    }
  }
  // Fallback: render as empty comment
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { warn } = require('@lytjs/common-error');
    warn(`SSR stream: could not render component vnode`);
  }
}

// ============================================================
// streamElementAsync
// ============================================================

async function streamElementAsync(
  vnode: VNode,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  commentMarkers: boolean,
): Promise<void> {
  const tag = vnode.type as string;

  if (!isValidHTMLElementTag(tag)) {
    if (__DEV__) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { warn } = require('@lytjs/common-error');
      warn(`Invalid SSR stream element tag: "${tag}"`);
    }
    return;
  }

  const props = vnode.props ?? {};
  const { shapeFlag, children } = vnode;

  // Build opening tag with attributes
  let openTag = `<${tag}`;

  // Render props as attributes
  for (const key of Object.keys(props)) {
    if (key === 'key' || key === 'ref') continue;
    openTag += renderAttributeToString(key, props[key]);
  }

  // Self-closing elements
  if (isVoidElement(tag)) {
    openTag += ' />';
    pushChunk(controller, encoder, openTag, commentMarkers, `element:${tag}`);
    return;
  }

  openTag += '>';
  pushChunk(controller, encoder, openTag, commentMarkers, `element:${tag}:open`);

  // Stream children
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    const text = isFunction(children) ? '' : String(children ?? '');
    pushChunk(controller, encoder, escapeHtml(text), commentMarkers, `element:${tag}:text`);
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child != null) {
        await streamVNodeAsync(child, controller, encoder, commentMarkers);
        await yieldToMicrotask();
      }
    }
  }

  // Closing tag
  const closeTag = `</${tag}>`;
  pushChunk(controller, encoder, closeTag, commentMarkers, `element:${tag}:close`);
}

// ============================================================
// yieldToMicrotask - yield control to allow progressive delivery
// ============================================================

// FIX: v7-P2-14 yieldToMicrotask 使用 queueMicrotask 替代 setTimeout
function yieldToMicrotask(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(resolve);
    } else {
      // 回退：使用 Promise.resolve().then() 作为微任务
      Promise.resolve().then(resolve);
    }
  });
}
