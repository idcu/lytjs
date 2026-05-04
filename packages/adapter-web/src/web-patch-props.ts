/**
 * @lytjs/adapter-web - DOM Property Patching
 * Enhanced patchProp for DOM elements with class, style, event, and attribute handling.
 * Delegates shared logic to @lytjs/common-dom, event caching to web-patch-events.
 *
 * 从 @lytjs/renderer/src/dom/patch-props.ts 迁移，纯翻译，不做额外归一化。
 */

import {
  patchClass as domPatchClass,
  patchStyle as domPatchStyle,
  patchProp as domPatchProp,
} from '@lytjs/common-dom';
import { isOn } from '@lytjs/common-events';
import { patchEvent as invokerPatchEvent } from './web-patch-events';

// Re-export shared functions for backward compatibility
export { patchClass, patchStyle, patchAttr } from '@lytjs/common-dom';

// Re-export web-patch-events types and functions
export {
  patchEvent,
  normalizeEventName,
  getEventKey,
  parseEventModifier,
  createInvoker,
  removeAllEventListeners,
} from './web-patch-events';
export type { ParsedEvent, EventInvoker } from './web-patch-events';

// ============================================================
// patchProp - main entry (renderer-specific: adds invoker events)
// ============================================================

/**
 * Patch a prop on a DOM element.
 * Delegates class/style/attr/innerHTML/textContent to @lytjs/common-dom,
 * and uses invoker-based event handling from web-patch-events.
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
    // 使用 web-patch-events 的 invoker 模式
    invokerPatchEvent(
      el,
      key,
      nextValue as ((...args: unknown[]) => void) | null,
      prevValue as ((...args: unknown[]) => void) | null,
    );
  } else {
    // Delegate to common-dom for innerHTML, textContent, and attrs
    domPatchProp(el, key, prevValue, nextValue, isSVG);
  }
}
