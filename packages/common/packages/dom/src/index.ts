/**
 * @lytjs/common-dom - Shared DOM utilities for Lyt.js
 *
 * Provides unified SVG tag detection, DOM property patching functions
 * (patchClass, patchStyle, patchAttr, patchProp) shared between
 * @lytjs/vdom and @lytjs/renderer.
 *
 * @module @lytjs/common-dom
 * @version 0.1.0
 */

// ==================== Imports ====================

import { camelToKebab, isSafeAttribute, sanitizeHTML, isBooleanAttr } from '@lytjs/common-string';
import { warn } from '@lytjs/common-error';

// Global dev flag declaration (injected by build tool)
declare const __DEV__: boolean;

// ==================== SVG Constants ====================

/**
 * Complete set of SVG elements that require the SVG namespace.
 * Merged from @lytjs/vdom and @lytjs/renderer (union of both sets).
 */
export const SVG_TAGS = new Set([
  // Basic shapes
  'svg',
  'path',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'rect',
  // Groups & containers
  'g',
  'defs',
  'use',
  'clipPath',
  'mask',
  'symbol',
  'marker',
  'pattern',
  'foreignObject',
  'image',
  // Text
  'text',
  'tspan',
  'textPath',
  // Gradients
  'linearGradient',
  'radialGradient',
  'stop',
  // Filters
  'filter',
  'feBlend',
  'feColorMatrix',
  'feComponentTransfer',
  'feComposite',
  'feConvolveMatrix',
  'feDiffuseLighting',
  'feDisplacementMap',
  'feDistantLight',
  'feFlood',
  'feGaussianBlur',
  'feImage',
  'feMerge',
  'feMergeNode',
  'feMorphology',
  'feOffset',
  'fePointLight',
  'feSpecularLighting',
  'feSpotLight',
  'feTile',
  'feTurbulence',
  // Animation
  'animate',
  'animateTransform',
  'animateMotion',
  'set',
]);

/** SVG namespace URI */
export const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Check if a tag name is an SVG element
 */
export function isSVGTag(tag: string): boolean {
  return SVG_TAGS.has(tag);
}

// ==================== patchClass ====================

/**
 * Patch the class attribute on an element.
 * Uses String() conversion for robust null/undefined handling.
 */
export function patchClass(el: Element, prev: unknown, next: unknown): void {
  const el_ = el as HTMLElement;
  const prevClass = prev == null ? '' : String(prev);
  const nextClass = next == null ? '' : String(next);
  if (prevClass !== nextClass) {
    el_.className = nextClass;
  }
}

// ==================== patchStyle ====================

/**
 * Patch the style attribute on an element.
 * Handles string <-> object transitions, camelCase <-> kebab-case conversion,
 * and proper property removal via removeProperty.
 */
export function patchStyle(el: Element, prev: unknown, next: unknown): void {
  const el_ = el as HTMLElement;
  const style = el_.style;

  if (!next || next === '') {
    el_.removeAttribute('style');
    return;
  }

  const prevStyle = prev as Record<string, string | number> | null | undefined;
  const nextStyle = next as Record<string, string | number> | string;

  if (nextStyle && typeof nextStyle !== 'object' && typeof nextStyle !== 'string') {
    return;
  }

  if (typeof nextStyle === 'string') {
    if (prevStyle && typeof prevStyle !== 'string') {
      // Was object, now string - clear all inline styles
      for (const key in prevStyle) {
        style.removeProperty(camelToKebab(key));
      }
    }
    el_.setAttribute('style', nextStyle);
    return;
  }

  // nextStyle is an object
  if (prevStyle && typeof prevStyle !== 'string') {
    // Remove keys that existed in prev but not in next
    for (const key in prevStyle) {
      if (!(key in nextStyle)) {
        style.removeProperty(camelToKebab(key));
      }
    }
  } else if (typeof prevStyle === 'string') {
    // Was string, now object - clear the string style
    el_.removeAttribute('style');
  }

  // Apply all new styles
  for (const key in nextStyle) {
    const val = nextStyle[key];
    if (val != null && val !== '') {
      style.setProperty(camelToKebab(key), String(val));
    } else {
      style.removeProperty(camelToKebab(key));
    }
  }
}

// ==================== patchAttr ====================

/**
 * Patch a regular or boolean attribute on an element.
 * Includes safety checks via isSafeAttribute.
 */
export function patchAttr(el: Element, key: string, value: unknown, _isSVG: boolean): void {
  if (value == null || value === false) {
    el.removeAttribute(key);
  } else if (isBooleanAttr(key)) {
    if (value === true || value === '') {
      el.setAttribute(key, '');
    } else {
      const strValue = String(value);
      if (!isSafeAttribute(key, strValue)) {
        if (__DEV__) {
          warn(`Unsafe attribute "${key}" with value "${strValue}" has been blocked.`);
        }
        return;
      }
      el.setAttribute(key, strValue);
    }
  } else {
    const strValue = String(value);
    if (!isSafeAttribute(key, strValue)) {
      if (__DEV__) {
        warn(`Unsafe attribute "${key}" with value "${strValue}" has been blocked.`);
      }
      return;
    }
    el.setAttribute(key, strValue);
  }
}

// ==================== patchProp ====================

/**
 * Patch a prop on a DOM element.
 * Dispatches to specialized handlers for class, style, events, and attributes.
 *
 * Note: Event handling is intentionally NOT included here. Consumers
 * (vdom/renderer) should handle events themselves based on their
 * chosen strategy (direct binding vs invoker pattern).
 */
export function patchProp(
  el: Element,
  key: string,
  prevValue: unknown,
  nextValue: unknown,
  isSVG: boolean = false,
): void {
  if (key === 'class') {
    patchClass(el, prevValue, nextValue);
  } else if (key === 'style') {
    patchStyle(el, prevValue, nextValue);
  } else if (key === 'innerHTML') {
    if (nextValue !== prevValue) {
      if (__DEV__ && nextValue != null && typeof nextValue !== 'string') {
        warn('v-html expects a string value.');
      }
      const sanitized = nextValue == null ? '' : sanitizeHTML(String(nextValue));
      el.innerHTML = sanitized;
    }
  } else if (key === 'textContent') {
    if (nextValue !== prevValue) {
      el.textContent = nextValue == null ? '' : String(nextValue);
    }
  } else {
    patchAttr(el, key, nextValue, isSVG);
  }
}
