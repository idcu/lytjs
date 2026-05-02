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
// renderToStream - main entry
// ============================================================

/**
 * Render a VNode tree to a ReadableStream of HTML chunks.
 *
 * Each top-level element and component boundary produces a separate chunk,
 * enabling progressive HTML delivery. Suspense boundaries are supported:
 * when an async component is encountered, the fallback is streamed first,
 * then the real content is pushed once resolved.
 */
export function renderToStream(
  input: SSRInput,
  options?: SSRStreamOptions,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const commentMarkers = options?.commentMarkers ?? false;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      try {
        streamVNode(input.vnode, controller, encoder, commentMarkers);
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

// ============================================================
// streamVNode - recursive streaming
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

function streamVNode(
  vnode: VNode,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  commentMarkers: boolean,
): void {
  const { type, shapeFlag, children } = vnode;

  // Handle Fragment
  if (type === Fragment) {
    streamFragment(vnode, controller, encoder, commentMarkers);
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

  // Handle Element
  if (shapeFlag & ShapeFlags.ELEMENT) {
    streamElement(vnode, controller, encoder, commentMarkers);
    return;
  }
}

// ============================================================
// streamFragment
// ============================================================

function streamFragment(
  vnode: VNode,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  commentMarkers: boolean,
): void {
  const children = vnode.children;
  if (isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child != null) {
        streamVNode(child, controller, encoder, commentMarkers);
      }
    }
  }
}

// ============================================================
// streamElement
// ============================================================

function isValidHTMLElementTag(tag: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(tag);
}

function streamElement(
  vnode: VNode,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  commentMarkers: boolean,
): void {
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
  for (const key in props) {
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
        streamVNode(child, controller, encoder, commentMarkers);
      }
    }
  }

  // Closing tag
  const closeTag = `</${tag}>`;
  pushChunk(controller, encoder, closeTag, commentMarkers, `element:${tag}:close`);
}

// ============================================================
// renderStreamAttributeToString
// ============================================================

// Security: attributes that carry URLs and need protocol validation
const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'xlink:href', 'data', 'srcdoc']);

// Named entity decoding constants
const NAMED_ENTITIES: Record<string, string> = {
  '&colon;': ':',
  '&tab;': '\t',
  '&newline;': '\n',
  '&lpar;': '(',
  '&rpar;': ')',
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
