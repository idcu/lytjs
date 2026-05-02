/**
 * @lytjs/renderer - DOM property patching
 * Enhanced patchProp for DOM elements with class, style, event, and attribute handling.
 * Delegates shared logic to @lytjs/common-dom, adds invoker event caching on top.
 */

import {
  patchClass as domPatchClass,
  patchStyle as domPatchStyle,
  patchProp as domPatchProp,
} from '@lytjs/common-dom';
import {
  getDOMEventName,
  extractDOMEventHandler,
  extractDOMEventOptions,
  isOn,
} from '@lytjs/common-events';

// Re-export shared functions for backward compatibility
export { patchClass, patchStyle, patchAttr } from '@lytjs/common-dom';

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
// patchEvent (renderer-specific: uses invoker pattern)
// ============================================================

/**
 * Patch an event listener on an element using the invoker pattern.
 * Supports event options (capture, passive, once) when nextValue is an
 * object with a handler property.
 */
export function patchEvent(el: Element, rawName: string, prev: unknown, next: unknown): void {
  const eventName = getDOMEventName(rawName);
  const prevHandler = extractDOMEventHandler(prev);
  const prevOptions = extractDOMEventOptions(prev);
  const nextHandler = extractDOMEventHandler(next);
  const nextOptions = extractDOMEventOptions(next);

  if (prevHandler) {
    const elMap = invokerCache.get(el);
    if (elMap) {
      const invoker = elMap.get(rawName);
      if (invoker) {
        el.removeEventListener(eventName, invoker, prevOptions);
      }
    }
  }

  if (nextHandler) {
    const invoker = getOrCreateInvoker(el, rawName);
    invoker.value = nextHandler;
    el.addEventListener(eventName, invoker, nextOptions);
  }
}

// ============================================================
// patchProp - main entry (renderer-specific: adds invoker events)
// ============================================================

/**
 * Patch a prop on a DOM element.
 * Delegates class/style/attr/innerHTML/textContent to @lytjs/common-dom,
 * and adds invoker-based event handling on top.
 */
export function patchProp(
  el: Element,
  key: string,
  prevValue: unknown,
  nextValue: unknown,
  isSVG: boolean = false,
): void {
  if (key === 'class') {
    domPatchClass(el, prevValue, nextValue);
  } else if (key === 'style') {
    domPatchStyle(el, prevValue, nextValue);
  } else if (isOn(key)) {
    patchEvent(el, key, prevValue, nextValue);
  } else {
    // Delegate to common-dom for innerHTML, textContent, and attrs
    domPatchProp(el, key, prevValue, nextValue, isSVG);
  }
}
