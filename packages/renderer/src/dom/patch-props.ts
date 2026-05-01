/**
 * @lytjs/renderer - DOM property patching
 * Enhanced patchProp for DOM elements with class, style, event, and attribute handling
 */

import { isString } from "@lytjs/common-is";
import { camelToKebab, isSafeAttribute } from "@lytjs/common-string";
import {
  getDOMEventName,
  extractDOMEventHandler,
  extractDOMEventOptions,
} from "@lytjs/common-events";
import { isBooleanAttr } from "../utils";

// ============================================================
// Local helpers (not in common-is)
// ============================================================

/**
 * Check if a key is an event handler (onXxx)
 */
export function isOn(key: string): boolean {
  return /^on[A-Z]/.test(key);
}

// ============================================================
// Event invoker pattern
// ============================================================

interface Invoker extends EventListener {
  value: EventListener;
  attached: number;
}

const invokerCache = new WeakMap<Element, Map<string, Invoker>>();

function getOrCreateInvoker(el: Element, rawName: string): Invoker {
  let elMap = invokerCache.get(el);
  if (!elMap) {
    elMap = new Map();
    invokerCache.set(el, elMap);
  }

  let invoker = elMap.get(rawName);
  if (!invoker) {
    invoker = ((e: Event) => {
      invoker!.value(e);
    }) as unknown as Invoker;
    invoker.attached = Date.now();
    elMap.set(rawName, invoker);
  }
  return invoker;
}

// ============================================================
// patchClass
// ============================================================

/**
 * Patch the class attribute on an element
 */
export function patchClass(el: Element, prev: unknown, next: unknown): void {
  const el_ = el as HTMLElement;
  const prevClass = prev == null ? "" : String(prev);
  const nextClass = next == null ? "" : String(next);
  if (prevClass !== nextClass) {
    el_.className = nextClass;
  }
}

// ============================================================
// patchStyle
// ============================================================

/**
 * Patch the style attribute on an element
 */
export function patchStyle(el: Element, prev: unknown, next: unknown): void {
  const el_ = el as HTMLElement;
  const style = el_.style;

  if (!next || next === "") {
    el_.removeAttribute("style");
    return;
  }

  const prevStyle = prev as Record<string, string | number> | null | undefined;
  const nextStyle = next as Record<string, string | number> | string;

  if (isString(nextStyle)) {
    if (prevStyle && !isString(prevStyle)) {
      // Was object, now string - clear all inline styles
      for (const key in prevStyle) {
        style.removeProperty(camelToKebab(key));
      }
    }
    el_.setAttribute("style", nextStyle);
    return;
  }

  // nextStyle is an object
  if (prevStyle && !isString(prevStyle)) {
    // Remove keys that existed in prev but not in next
    for (const key in prevStyle) {
      if (!(key in nextStyle)) {
        style.removeProperty(camelToKebab(key));
      }
    }
  } else if (isString(prevStyle)) {
    // Was string, now object - clear the string style
    el_.removeAttribute("style");
  }

  // Apply all new styles
  for (const key in nextStyle) {
    const val = nextStyle[key];
    if (val != null && val !== "") {
      style.setProperty(camelToKebab(key), String(val));
    } else {
      style.removeProperty(camelToKebab(key));
    }
  }
}

// ============================================================
// patchEvent
// ============================================================

/**
 * Patch an event listener on an element using the invoker pattern.
 * Supports event options (capture, passive, once) when nextValue is an
 * object with a handler property.
 */
export function patchEvent(
  el: Element,
  rawName: string,
  prev: unknown,
  next: unknown,
): void {
  // Extract event name using the mapping table
  const eventName = getDOMEventName(rawName);

  // Normalize prev/next to extract handler and options
  const prevHandler = extractDOMEventHandler(prev);
  const prevOptions = extractDOMEventOptions(prev);
  const nextHandler = extractDOMEventHandler(next);
  const nextOptions = extractDOMEventOptions(next);

  // Remove previous listener
  if (prevHandler) {
    const elMap = invokerCache.get(el);
    if (elMap) {
      const invoker = elMap.get(rawName);
      if (invoker) {
        el.removeEventListener(eventName, invoker, prevOptions);
      }
    }
  }

  // Add new listener
  if (nextHandler) {
    const invoker = getOrCreateInvoker(el, rawName);
    invoker.value = nextHandler;
    el.addEventListener(eventName, invoker, nextOptions);
  }
}

// ============================================================
// patchAttr
// ============================================================

/**
 * Patch a regular or boolean attribute on an element
 */
export function patchAttr(
  el: Element,
  key: string,
  value: unknown,
  _isSVG: boolean,
): void {
  if (value == null || value === false) {
    el.removeAttribute(key);
  } else if (isBooleanAttr(key)) {
    // Boolean attributes: presence means true
    if (value === true || value === "") {
      el.setAttribute(key, "");
    } else {
      const strValue = String(value);
      if (!isSafeAttribute(key, strValue)) {
        if (__DEV__) {
          console.warn(
            `[LyticsJS warn] Unsafe attribute "${key}" with value "${strValue}" has been blocked.`,
          );
        }
        return;
      }
      el.setAttribute(key, strValue);
    }
  } else {
    const strValue = String(value);
    if (!isSafeAttribute(key, strValue)) {
      if (__DEV__) {
        console.warn(
          `[LyticsJS warn] Unsafe attribute "${key}" with value "${strValue}" has been blocked.`,
        );
      }
      return;
    }
    el.setAttribute(key, strValue);
  }
}

// ============================================================
// HTML sanitization
// ============================================================

/**
 * Runtime HTML sanitization for innerHTML.
 * Defends against common XSS vectors when using v-html:
 *  - Removes dangerous tags (script, iframe, object, embed, form, input, etc.)
 *  - Strips event-handler attributes (on*)
 *  - Neutralises javascript: / vbscript: / data: URIs
 *  - Handles HTML-entity encoding bypasses by decoding before checking
 */
function sanitizeHTML(str: string): string {
  // 1. Decode HTML entities so encoded payloads are not missed.
  //    We apply decode repeatedly until the string stabilises (handles
  //    double-encoding like &amp;lt;script&amp;gt;).
  let decoded = str;
  const decodeMap: [RegExp, string | ((...args: any[]) => string)][] = [
    [
      /&#x0*([0-9a-fA-F]+);/g,
      (_: any, code: any) => String.fromCodePoint(parseInt(code, 16)),
    ],
    [/&#0*([0-9]+);/g, (_: any, code: any) => String.fromCodePoint(parseInt(code, 10))],
    [/&amp;/gi, "&"],
    [/&lt;/gi, "<"],
    [/&gt;/gi, ">"],
    [/&quot;/gi, '"'],
    [/&apos;/gi, "'"],
    [/&#x27;/gi, "'"],
    [/&#x22;/gi, '"'],
  ];
  // Run up to 5 rounds to handle nested encoding.
  // Fast path: skip decoding entirely if the string contains no '&' character,
  // since HTML entities always start with '&'.
  if (str.includes("&")) {
    for (let i = 0; i < 5; i++) {
      const prev = decoded;
      for (const [re, repl] of decodeMap) {
        decoded = decoded.replace(re, repl as any);
      }
      if (decoded === prev) break;
    }
  }

  // 2. Remove dangerous tags (both self-closing and normal forms).
  const dangerousTags = [
    "script",
    "iframe",
    "object",
    "embed",
    "form",
    "input",
    "textarea",
    "select",
    "button",
    "link",
    "meta",
    "base",
    "applet",
    "frame",
    "frameset",
    "details",
    "marquee",
    "math",
    "svg",
  ];
  const tagPattern = dangerousTags.join("|");
  const openCloseTagRe = new RegExp(`<\\/?(${tagPattern})\\b(?:[^>"']|"[^"]*"|'[^']*')*>`, "gi");
  decoded = decoded.replace(openCloseTagRe, "");

  // 3. Remove event-handler attributes (on*).
  //    Matches on<word>=  inside any tag, consuming the quoted value.
  decoded = decoded.replace(
    /(<[^>]*?)\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
    "$1",
  );

  // 4. Neutralise dangerous URI schemes in href / src / action / formaction / xlink:href.
  const uriAttrs =
    "href|src|action|formaction|xlink:href|data|codebase|cite|background|poster|dynsrc|lowsrc";
  const uriRe = new RegExp(
    `(?:(${uriAttrs})\\s*=\\s*)(?:"([^"]*)"|'([^']*)')`,
    "gi",
  );
  decoded = decoded.replace(
    uriRe,
    (_match, attr: string, dq: string, sq: string) => {
      const value = dq ?? sq ?? "";
      // Strip whitespace / null bytes / control chars that could hide the scheme
      // eslint-disable-next-line no-control-regex
      const cleaned = value.replace(/[\u0000-\u0020\u00A0\u1680\u2000-\u200B\u2028\u2029\u202F\u205F\u3000\uFEFF]+/g, "").toLowerCase();
      if (/^(javascript|vbscript|data|mhtml|x-javascript)\s*:/i.test(cleaned)) {
        return `${attr}=""`;
      }
      return _match;
    },
  );

  return decoded;
}

// ============================================================
// patchProp - main entry
// ============================================================

/**
 * Patch a prop on a DOM element.
 * Dispatches to specialized handlers for class, style, events, and attributes.
 */
export function patchProp(
  el: Element,
  key: string,
  prevValue: unknown,
  nextValue: unknown,
  isSVG: boolean = false,
): void {
  if (key === "class") {
    patchClass(el, prevValue, nextValue);
  } else if (key === "style") {
    patchStyle(el, prevValue, nextValue);
  } else if (isOn(key)) {
    patchEvent(el, key, prevValue, nextValue);
  } else if (key === "innerHTML") {
    if (nextValue !== prevValue) {
      if (__DEV__ && nextValue != null && typeof nextValue !== "string") {
        console.warn("v-html expects a string value.");
      }
      const sanitized =
        nextValue == null ? "" : sanitizeHTML(String(nextValue));
      el.innerHTML = sanitized;
    }
  } else if (key === "textContent") {
    if (nextValue !== prevValue) {
      el.textContent = nextValue == null ? "" : String(nextValue);
    }
  } else {
    patchAttr(el, key, nextValue, isSVG);
  }
}
