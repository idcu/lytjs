/**
 * @lytjs/adapter-web - DOM Property Patching
 * Enhanced patchProp for DOM elements with class, style, event, and attribute handling.
 * Delegates shared logic to @lytjs/common-dom, event caching to web-patch-events.
 *
 * 从 @lytjs/renderer/src/dom/patch-props.ts 迁移，纯翻译，不做额外归一化。
 *
 * TODO (P2-13): Vendor prefix 处理为未来优化项。
 * 当前未对 CSS 属性和 DOM 属性做 vendor prefix 自动转换（如 webkitTransform -> -webkit-transform）。
 * 现代浏览器已逐步移除对 vendor prefix 的需求，但在需要兼容旧版浏览器的场景下，
 * 可考虑在 patchStyle 和 patchAttr 中添加自动 prefix 检测与转换逻辑。
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
export { patchEvent, createInvoker, removeAllEventListeners } from './web-patch-events';
export type { ParsedEvent, EventInvoker } from './web-patch-events';

// normalizeEventName, getEventKey, parseEventModifier 已迁移到 @lytjs/common-events
export { normalizeEventName, getEventKey, parseEventModifier } from '@lytjs/common-events';

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
  } else if (isSVG && key.startsWith('xlink:')) {
    // SVG xlink namespace attributes (e.g. xlink:href, xlink:show)
    // Must use setAttributeNS with the xlink namespace URI
    if (nextValue == null || nextValue === false) {
      el.removeAttributeNS('http://www.w3.org/1999/xlink', key.slice(6));
    } else {
      el.setAttributeNS('http://www.w3.org/1999/xlink', key, String(nextValue));
    }
  } else if (isSVG && key === 'xml:lang') {
    // SVG xml: 命名空间属性
    if (nextValue == null || nextValue === false) {
      el.removeAttributeNS('http://www.w3.org/XML/1998/namespace', 'lang');
    } else {
      el.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:lang', String(nextValue));
    }
  } else if (isSVG && key === 'xml:space') {
    if (nextValue == null || nextValue === false) {
      el.removeAttributeNS('http://www.w3.org/XML/1998/namespace', 'space');
    } else {
      el.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', String(nextValue));
    }
  } else {
    // Delegate to common-dom for innerHTML, textContent, and attrs
    domPatchProp(el, key, prevValue, nextValue, isSVG);
  }
}
