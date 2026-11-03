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

import {
  camelToKebab,
  isSafeAttribute,
  sanitizeHTML,
  isBooleanAttr,
  normalizeClass,
} from '@lytjs/common-string';
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
 *
 * ## ⚠️ 2026-10-27 修（P0）：两处都是真崩过的
 *
 * ### ① SVG 元素上 `className` 是**只读**的
 *
 * `SVGElement.className` 是 `SVGAnimatedString`（不是字符串），赋值直接抛
 * `TypeError: Cannot set property className of [object SVGElement] which has only a getter`。
 * 而 `<svg class="icon">` 是最常见的写法之一 —— 实测 `<Empty />` 与 `<Spin />`
 * **挂载即崩**（两者都渲染 svg 图标），且异常会中断整棵树的挂载。
 * 改用 `setAttribute('class', …)`：对 HTML 与 SVG 语义一致。
 *
 * ### ② `String(next)` 会把对象/数组形态变成 `[object Object]`
 *
 * `:class="{ active: isActive }"` / `:class="['a', b]"` 是标准写法，
 * 旧实现 `String({active:true})` → 字面量 `[object Object]` 写进 DOM。
 * 改用 `@lytjs/common-string` 的 `normalizeClass`（本包已依赖它，不新增依赖边），
 * 与 `@lytjs/dom-runtime` 的 `setClass` 共用同一份归一化逻辑，避免两套实现分叉。
 */
export function patchClass(el: Element, prev: unknown, next: unknown): void {
  const prevClass = normalizeClass(prev as never);
  const nextClass = normalizeClass(next as never);
  if (prevClass === nextClass) return;

  // 不用 `el.className = …`：SVG 上是只读的（见上）
  el.setAttribute('class', nextClass);
}

// ==================== patchStyle ====================

/**
 * Patch the style attribute on an element.
 * Handles string <-> object transitions, camelCase <-> kebab-case conversion,
 * and proper property removal via removeProperty.
 */
/**
 * 把「静态 style + 动态 :style」的数组形态合并成一个对象。
 *
 * ⚠️ 2026-10-29 新增：编译器对 `style="color:blue" :style="{fontSize: s}"` 产出的是
 * **数组**（两个值都要保留）。此前 `patchStyle` 只认对象 / 字符串，数组直接落到
 * 「类型不认识 ⇒ return」⇒ **静态样式整条丢失**（实测只剩动态那部分）。
 * 合并规则与 CSS 层叠一致：后面的覆盖前面的。
 */
function normalizeStyleInput(value: unknown): Record<string, string | number> | string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const merged: Record<string, string | number> = {};
    for (const item of value) {
      const normalized = normalizeStyleInput(item);
      if (normalized === null) continue;
      if (typeof normalized === 'string') {
        // 字符串片段：解析成 k:v 再并入（`color:blue;font-size:12px`）
        for (const part of normalized.split(';')) {
          const idx = part.indexOf(':');
          if (idx <= 0) continue;
          const key = part.slice(0, idx).trim();
          const val = part.slice(idx + 1).trim();
          if (key) merged[key] = val;
        }
        continue;
      }
      Object.assign(merged, normalized);
    }
    return merged;
  }
  if (typeof value === 'object') return value as Record<string, string | number>;
  return null;
}

export function patchStyle(el: Element, prev: unknown, next: unknown): void {
  const el_ = el as HTMLElement;
  const style = el_.style;

  // 数组形态（静态 + 动态混写）先合并。
  // ⚠️ 只对**数组**做归一化：其它类型必须保持原样，让下面的「非法类型提前返回」
  //   分支继续生效（既有用例锁着这条契约）。
  if (Array.isArray(prev)) prev = normalizeStyleInput(prev);
  if (Array.isArray(next)) next = normalizeStyleInput(next);

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
  // ⚠️ 2026-11-04 新增：`aria-*` 的空串等同于「没设」，直接不写。
  //
  // 为什么在**这里**拦：`ariaLabel` / `ariaDescribedBy` 这类 prop 的默认值都是 `''`，
  // 而组件里普遍写 `'aria-describedby': p.ariaDescribedBy` —— 于是**每个实例**都渲染出
  // `aria-describedby=""`。它是**非法的 IDREF 列表**（规范要求至少一个 id），
  // `aria-label=""` 也不是「无标签」的正确表达（正确做法是不设该属性）。
  // 39 个组件、每个实例都在输出这两个空属性（实测 2026-11-04）。
  //
  // 在生成器（`@lytjs/common-a11y`）里也做了过滤，但组件手写的属性表绕过了生成器 ——
  // 所以在属性写入这一层再兜一次，新增组件不会再漏。
  if (value == null || (value === '' && key.startsWith('aria-'))) {
    el.removeAttribute(key);
  } else if (value === false) {
    // ⚠️ `aria-*` 的 `false` **必须**序列化为字符串 `"false"`，不能像 HTML 布尔属性那样移除：
    //   · WAI-ARIA：组合框上的 `aria-expanded` **必须存在**且为 `true` / `false`，
    //     缺失 ≠ false（读屏软件不会播报为「已折叠」）；
    //   · `false` 与「不设置」语义不同：`aria-hidden="false"` = **显式不隐藏**，
    //     而缺省 = 继承祖先的 `aria-hidden`。⇒ 要「不设置」应传 `undefined`/`null`。
    //   Vue 运行时同样是「aria 属性 false ⇒ `setAttribute(key, 'false')`」。
    //   实测（2026-10-13）：修复前 `Select` 关闭态的 `aria-expanded` 是 `null`（属性被丢弃）。
    if (key.startsWith('aria-')) {
      el.setAttribute(key, 'false');
    } else {
      el.removeAttribute(key);
    }
  } else if (isBooleanAttr(key)) {
    if (value === true || value === '') {
      el.setAttribute(key, '');
    } else {
      const strValue = typeof value === 'string' ? value : String(value);
      if (!isSafeAttribute(key, strValue)) {
        if (__DEV__) {
          warn(`Unsafe attribute "${key}" with value "${strValue}" has been blocked.`);
        }
        return;
      }
      el.setAttribute(key, strValue);
    }
  } else {
    const strValue = typeof value === 'string' ? value : String(value);
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
/**
 * 表单**状态**属性：必须写 DOM **property**，不能写 attribute。
 *
 * ⚠️ 2026-10-27 修（P0）：`value` / `checked` 此前直接落到 `patchAttr` ⇒ `setAttribute`。
 * 而 `setAttribute('value', …)` 只改 **defaultValue**：用户输入过一次之后，
 * 输入框会置上 *dirty value flag*，此后 attribute 变化**不再影响** live `value`。
 * 表现就是「数据改了、`<p>` 也变了，但输入框里的字不动」——
 * 即 `v-model` 只能单向（输入→数据），数据→DOM 失效。实测：
 *   S2 input=typed p=typed ref=typed
 *   S3 input=typed p=from-data ref=from-data   ← p 更新了，input 没有
 * `checked` 同理（attribute 只改 defaultChecked）。
 */
const FORM_STATE_KEYS = new Set(['value', 'checked', 'selected', 'indeterminate', 'muted']);

/** 写表单状态（property），并在值未变时跳过以免打断光标/输入法 */
function patchFormState(el: Element, key: string, nextValue: unknown): void {
  const node = el as unknown as Record<string, unknown>;

  if (key === 'value') {
    const next = nextValue == null ? '' : String(nextValue);
    if (node.value !== next) node.value = next;
    return;
  }

  const next = Boolean(nextValue);
  if (node[key] !== next) node[key] = next;
}

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
  } else if (FORM_STATE_KEYS.has(key)) {
    patchFormState(el, key, nextValue);
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
