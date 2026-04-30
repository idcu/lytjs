/**
 * @lytjs/renderer - SSR Renderer
 * Server-side rendering to string
 */

import type { VNode } from "@lytjs/vdom";
import { Fragment, Text, ShapeFlags } from "@lytjs/vdom";
import {
  isString,
  isArray,
  isObject,
  isFunction,
  isNullish,
} from "@lytjs/common-is";
import { camelToKebab } from "@lytjs/common-string";
import { escapeHtml, isBooleanAttr, isVoidElement } from "../utils";

const __DEV__ = process.env.NODE_ENV !== "production";

// ============================================================
// renderToString - main entry
// ============================================================

export interface SSRInput {
  vnode: VNode;
}

/**
 * Render a VNode to an HTML string (async for future Suspense support)
 *
 * 使用 async 声明的原因：为未来的 Suspense 异步组件预留支持。
 * 当组件包含异步子组件（如 Suspense boundary）时，渲染过程需要等待
 * 异步数据加载完成后再输出 HTML，因此 renderToString 必须是异步的。
 */
export async function renderToString(input: SSRInput): Promise<string> {
  return renderVNodeToString(input.vnode);
}

// ============================================================
// renderVNodeToString
// ============================================================

function renderVNodeToString(vnode: VNode): string {
  const { type, shapeFlag, children } = vnode;

  // Handle Fragment
  if (type === Fragment) {
    return renderFragmentToString(vnode);
  }

  // Handle Text
  if (type === Text) {
    const text = isFunction(children) ? "" : String(children ?? "");
    return escapeHtml(text);
  }

  // Handle Comment
  if (type === Comment) {
    const text = isFunction(children) ? "" : String(children ?? "");
    // 转义 <!-- 和 --> 防止注释注入导致 HTML 结构破坏
    const safe = text.replace(/<!--/g, "&lt;!--").replace(/-->/g, "--&gt;");
    return `<!--${safe}-->`;
  }

  // Handle Element
  if (shapeFlag & ShapeFlags.ELEMENT) {
    return renderElementToString(vnode);
  }

  return "";
}

// ============================================================
// renderFragmentToString
// ============================================================

function renderFragmentToString(vnode: VNode): string {
  const children = vnode.children;
  if (isArray(children)) {
    return children
      .map((child) => (child != null ? renderVNodeToString(child) : ""))
      .join("");
  }
  return "";
}

// ============================================================
// renderElementToString
// ============================================================

function isValidHTMLElementTag(tag: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(tag);
}

function renderElementToString(vnode: VNode): string {
  const tag = vnode.type as string;

  if (!isValidHTMLElementTag(tag)) {
    if (__DEV__) {
      console.warn(`[LytJS warn] Invalid SSR element tag: "${tag}"`);
    }
    return "";
  }

  const props = vnode.props ?? {};
  const { shapeFlag, children } = vnode;

  // Build opening tag with attributes
  let html = `<${tag}`;

  // Render props as attributes
  for (const key in props) {
    if (key === "key" || key === "ref") continue;
    html += renderAttributeToString(key, props[key]);
  }

  // Self-closing elements
  if (isVoidElement(tag)) {
    html += " />";
    return html;
  }

  html += ">";

  // Render children
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    const text = isFunction(children) ? "" : String(children ?? "");
    html += escapeHtml(text);
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child != null) {
        html += renderVNodeToString(child);
      }
    }
  }

  if (!isValidHTMLElementTag(tag)) {
    return "";
  }

  html += `</${tag}>`;
  return html;
}

// ============================================================
// renderAttributeToString
// ============================================================

// Security: block dangerous URL protocols on sensitive attributes
// Extracted to module-level constant to avoid re-creation on every render
const DANGEROUS_ATTRS = new Set([
  "href", "src", "action", "formaction", "xlink:href", "data", "srcdoc",
  "autofocus", "contenteditable", "draggable",
]);

const ALLOWED_URL_PROTOCOLS = new Set([
  "http", "https", "mailto", "tel",
]);

const DANGEROUS_PROTOCOLS = new Set([
  "javascript", "vbscript", "data",
]);

function isSafeURL(url: string): boolean {
  // Decode HTML entities before checking
  let decoded = url;
  try {
    decoded = decoded.replace(/&#x?[0-9a-f]+;/gi, (match) => {
      const text = match.replace(/&#x?/i, "").replace(/;$/, "");
      const code = parseInt(text, match.includes("x") ? 16 : 10);
      return code > 0 ? String.fromCharCode(code) : match;
    });
  } catch { /* ignore decode errors */ }

  const trimmed = decoded.trim().toLowerCase();
  const protocolMatch = trimmed.match(/^([a-z][a-z0-9+\-.]*?):/);
  if (!protocolMatch) {
    for (const proto of DANGEROUS_PROTOCOLS) {
      if (trimmed.includes(proto)) return false;
    }
    return true;
  }
  if (DANGEROUS_PROTOCOLS.has(protocolMatch[1])) return false;
  return ALLOWED_URL_PROTOCOLS.has(protocolMatch[1]);
}

function renderAttributeToString(key: string, value: unknown): string {
  // Skip null/undefined
  if (isNullish(value)) return "";

  // Skip event handlers
  if (/^on[A-Z]/.test(key)) return "";

  // Class handling
  if (key === "class") {
    const classValue = value == null ? "" : String(value);
    if (!classValue) return "";
    return ` class="${escapeHtml(classValue)}"`;
  }

  // Style handling
  if (key === "style") {
    if (isString(value)) {
      if (!value) return "";
      return ` style="${escapeHtml(value)}"`;
    }
    if (isObject(value)) {
      const styles: string[] = [];
      for (const k in value as Record<string, unknown>) {
        const val = (value as Record<string, unknown>)[k];
        if (val != null && val !== "") {
          styles.push(`${camelToKebab(k)}:${String(val)}`);
        }
      }
      if (styles.length === 0) return "";
      return ` style="${escapeHtml(styles.join(";"))}"`;
    }
    return "";
  }

  // Boolean attributes
  if (isBooleanAttr(key)) {
    if (value === false || value === "") return "";
    return ` ${key}`;
  }

  // Security: block dangerous URL protocols on sensitive attributes
  if (DANGEROUS_ATTRS.has(key)) {
    if (!isSafeURL(String(value))) {
      if (__DEV__) {
        console.warn(
          `[LytJS SSR] Blocked potentially dangerous attribute: ${key}="${String(value)}"`
        );
      }
      return "";
    }
  }

  // Regular attributes
  return ` ${key}="${escapeHtml(String(value))}"`;
}
