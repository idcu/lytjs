/**
 * @lytjs/renderer - SSR Streaming
 * Server-side streaming rendering using Web Streams API
 */

import type { VNode } from '@lytjs/vdom';
import { Fragment, Text, Comment, ShapeFlags } from '@lytjs/vdom';
import { isString, isArray, isObject, isFunction, isNullish } from '@lytjs/common-is';
import { camelToKebab } from '@lytjs/common-string';
import { warn } from '@lytjs/common-error';
import { escapeHtml, isBooleanAttr, isVoidElement } from '../utils';
import type { SSRInput } from './ssr-renderer';

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
    warn(`SSR stream: could not render component vnode`);
  }
}

// ============================================================
// streamElementAsync
// ============================================================

function isValidHTMLElementTag(tag: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(tag);
}

async function streamElementAsync(
  vnode: VNode,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  commentMarkers: boolean,
): Promise<void> {
  const tag = vnode.type as string;

  if (!isValidHTMLElementTag(tag)) {
    if (__DEV__) {
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
    openTag += renderStreamAttributeToString(key, props[key]);
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

// ============================================================
// renderStreamAttributeToString
// ============================================================

// Security: attributes that carry URLs and need protocol validation
const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'xlink:href', 'data', 'srcdoc']);

// Named entity decoding constants
export const NAMED_ENTITIES: Record<string, string> = {
  '&colon;': ':',
  '&tab;': '\t',
  '&newline;': '\n',
  '&lpar;': '(',
  '&rpar;': ')',
  '&nbsp;': '\u00A0',
  '&copy;': '\u00A9',
  '&reg;': '\u00AE',
  '&trade;': '\u2122',
  '&times;': '\u00D7',
  '&divide;': '\u00F7',
  '&pound;': '\u00A3',
  '&yen;': '\u00A5',
  '&cent;': '\u00A2',
  '&sect;': '\u00A7',
  '&para;': '\u00B6',
  '&middot;': '\u00B7',
  '&laquo;': '\u00AB',
  '&raquo;': '\u00BB',
  '&iexcl;': '\u00A1',
  '&iquest;': '\u00BF',
  '&deg;': '\u00B0',
  '&plusmn;': '\u00B1',
  '&micro;': '\u00B5',
  '&frac14;': '\u00BC',
  '&frac12;': '\u00BD',
  '&frac34;': '\u00BE',
  '&sup1;': '\u00B9',
  '&sup2;': '\u00B2',
  '&sup3;': '\u00B3',
  '&acute;': '\u00B4',
  '&cedil;': '\u00B8',
  '&ordf;': '\u00AA',
  '&not;': '\u00AC',
  '&shy;': '\u00AD',
  '&macr;': '\u00AF',
  '&uml;': '\u00A8',
  '&circ;': '\u02C6',
  '&tilde;': '\u02DC',
  '&ensp;': '\u2002',
  '&emsp;': '\u2003',
  '&thinsp;': '\u2009',
  '&zwnj;': '\u200C',
  '&zwj;': '\u200D',
  '&lrm;': '\u200E',
  '&rlm;': '\u200F',
  '&ndash;': '\u2013',
  '&mdash;': '\u2014',
  '&lsquo;': '\u2018',
  '&rsquo;': '\u2019',
  '&sbquo;': '\u201A',
  '&ldquo;': '\u201C',
  '&rdquo;': '\u201D',
  '&bdquo;': '\u201E',
  '&dagger;': '\u2020',
  '&Dagger;': '\u2021',
  '&bull;': '\u2022',
  '&hellip;': '\u2026',
  '&permil;': '\u2030',
  '&prime;': '\u2032',
  '&Prime;': '\u2033',
  '&lsaquo;': '\u2039',
  '&rsaquo;': '\u203A',
  '&oline;': '\u203E',
  '&frasl;': '\u2044',
  '&euro;': '\u20AC',
  '&larr;': '\u2190',
  '&uarr;': '\u2191',
  '&rarr;': '\u2192',
  '&darr;': '\u2193',
  '&harr;': '\u2194',
  '&crarr;': '\u21B5',
  '&lceil;': '\u2308',
  '&rceil;': '\u2309',
  '&lfloor;': '\u230A',
  '&rfloor;': '\u230B',
  '&lang;': '\u27E8',
  '&rang;': '\u27E9',
  '&loz;': '\u25CA',
  '&spades;': '\u2660',
  '&clubs;': '\u2663',
  '&hearts;': '\u2665',
  '&diams;': '\u2666',
  '&OElig;': '\u0152',
  '&oelig;': '\u0153',
  '&Scaron;': '\u0160',
  '&scaron;': '\u0161',
  '&Yuml;': '\u0178',
  '&fnof;': '\u0192',
  '&Alpha;': '\u0391',
  '&Beta;': '\u0392',
  '&Gamma;': '\u0393',
  '&Delta;': '\u0394',
  '&Epsilon;': '\u0395',
  '&Zeta;': '\u0396',
  '&Eta;': '\u0397',
  '&Theta;': '\u0398',
  '&Iota;': '\u0399',
  '&Kappa;': '\u039A',
  '&Lambda;': '\u039B',
  '&Mu;': '\u039C',
  '&Nu;': '\u039D',
  '&Xi;': '\u039E',
  '&Omicron;': '\u039F',
  '&Pi;': '\u03A0',
  '&Rho;': '\u03A1',
  '&Sigma;': '\u03A3',
  '&Tau;': '\u03A4',
  '&Upsilon;': '\u03A5',
  '&Phi;': '\u03A6',
  '&Chi;': '\u03A7',
  '&Psi;': '\u03A8',
  '&Omega;': '\u03A9',
  '&alpha;': '\u03B1',
  '&beta;': '\u03B2',
  '&gamma;': '\u03B3',
  '&delta;': '\u03B4',
  '&epsilon;': '\u03B5',
  '&zeta;': '\u03B6',
  '&eta;': '\u03B7',
  '&theta;': '\u03B8',
  '&iota;': '\u03B9',
  '&kappa;': '\u03BA',
  '&lambda;': '\u03BB',
  '&mu;': '\u03BC',
  '&nu;': '\u03BD',
  '&xi;': '\u03BE',
  '&omicron;': '\u03BF',
  '&pi;': '\u03C0',
  '&rho;': '\u03C1',
  '&sigmaf;': '\u03C2',
  '&sigma;': '\u03C3',
  '&tau;': '\u03C4',
  '&upsilon;': '\u03C5',
  '&phi;': '\u03C6',
  '&chi;': '\u03C7',
  '&psi;': '\u03C8',
  '&omega;': '\u03C9',
  '&thetasym;': '\u03D1',
  '&upsih;': '\u03D2',
  '&piv;': '\u03D6',
  '&apos;': "'",
  '&quot;': '"',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
};
const NAMED_ENTITY_REGEX = new RegExp(
  Object.keys(NAMED_ENTITIES)
    .map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
  'g',
);
const NUMERIC_ENTITY_REGEX = /&#x?[0-9a-f]+;/gi;

function isSafeURL(url: string): boolean {
  let decoded = url;
  let prev = '';
  let maxIterations = 10;
  while (decoded !== prev && maxIterations-- > 0) {
    prev = decoded;
    decoded = decoded.replace(NUMERIC_ENTITY_REGEX, (match) => {
      const codePoint = match.startsWith('&#x')
        ? parseInt(match.slice(3, -1), 16)
        : parseInt(match.slice(2, -1), 10);
      if (isNaN(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
        return match;
      }
      return String.fromCodePoint(codePoint);
    });
    decoded = decoded.replace(NAMED_ENTITY_REGEX, (match) => NAMED_ENTITIES[match] || match);
  }
  try {
    const parsed = new URL(decoded, 'http://example.com');
    const protocol = parsed.protocol.toLowerCase().replace(':', '');
    if (protocol === 'javascript') {
      return false;
    }
    if (protocol === 'data') {
      if (/^data:image\/svg\+xml/i.test(decoded)) {
        return false;
      }
      return /^data:image\/(png|jpeg|jpg|gif|webp|bmp|ico|avif);/i.test(decoded);
    }
    return true;
  } catch {
    return false;
  }
}

function renderStreamAttributeToString(key: string, value: unknown): string {
  // Skip null/undefined
  if (isNullish(value)) return '';

  // Skip event handlers
  if (/^on[A-Z]/.test(key)) return '';

  // Class handling
  if (key === 'class') {
    const classValue = value == null ? '' : String(value);
    if (!classValue) return '';
    return ` class="${escapeHtml(classValue)}"`;
  }

  // Style handling
  if (key === 'style') {
    if (isString(value)) {
      if (!value) return '';
      return ` style="${escapeHtml(value)}"`;
    }
    if (isObject(value)) {
      const styles: string[] = [];
      for (const k in value as Record<string, unknown>) {
        const val = (value as Record<string, unknown>)[k];
        if (val != null && val !== '') {
          styles.push(`${camelToKebab(k)}:${String(val)}`);
        }
      }
      if (styles.length === 0) return '';
      return ` style="${escapeHtml(styles.join(';'))}"`;
    }
    return '';
  }

  // Boolean attributes
  if (isBooleanAttr(key)) {
    if (value === false || value === '') return '';
    return ` ${key}`;
  }

  // Security: block dangerous URL protocols on URL attributes
  if (URL_ATTRS.has(key)) {
    if (!isSafeURL(String(value))) {
      if (__DEV__) {
        warn(`Blocked potentially dangerous attribute: ${key}="${String(value)}"`);
      }
      return '';
    }
  }

  // Regular attributes
  return ` ${key}="${escapeHtml(String(value))}"`;
}
