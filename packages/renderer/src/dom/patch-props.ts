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

const __DEV__ = process.env.NODE_ENV !== "production";

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
  } else {
    patchAttr(el, key, nextValue, isSVG);
  }
}
