/**
 * Lyt.js 渲染器 — DOM 操作辅助函数
 *
 * 提供 DOM 属性操作的底层辅助函数。
 */

/* ================================================================
 *  常量与配置
 * ================================================================ */

const DOM_PROPS: Record<string, string> = {
  acceptCharset: 'acceptCharset', accessKey: 'accessKey',
  className: 'className', htmlFor: 'htmlFor',
  httpEquiv: 'httpEquiv', tabIndex: 'tabIndex',
};

const BOOLEAN_ATTRS: Record<string, boolean> = {
  allowfullscreen: true, async: true, autofocus: true, autoplay: true,
  checked: true, controls: true, default: true, defer: true,
  disabled: true, formnovalidate: true, hidden: true, inert: true,
  ismap: true, itemscope: true, loop: true, multiple: true,
  muted: true, nomodule: true, novalidate: true, open: true,
  playsinline: true, readonly: true, required: true, reversed: true,
  selected: true,
};

const SVG_ATTRS: Record<string, string> = {
  'accent-height': 'accentHeight', 'alignment-baseline': 'alignmentBaseline',
  'baseline-shift': 'baselineShift', 'clip-path': 'clipPath', 'clip-rule': 'clipRule',
  'color-interpolation': 'colorInterpolation',
  'color-interpolation-filters': 'colorInterpolationFilters',
  'dominant-baseline': 'dominantBaseline', 'enable-background': 'enableBackground',
  'fill-opacity': 'fillOpacity', 'fill-rule': 'fillRule',
  'flood-color': 'floodColor', 'flood-opacity': 'floodOpacity',
  'glyph-orientation-horizontal': 'glyphOrientationHorizontal',
  'glyph-orientation-vertical': 'glyphOrientationVertical',
  'font-family': 'fontFamily', 'font-size': 'fontSize',
  'font-style': 'fontStyle', 'font-variant': 'fontVariant',
  'font-weight': 'fontWeight', 'image-rendering': 'imageRendering',
  'letter-spacing': 'letterSpacing', 'lighting-color': 'lightingColor',
  'marker-end': 'markerEnd', 'marker-mid': 'markerMid', 'marker-start': 'markerStart',
  'paint-order': 'paintOrder', 'pointer-events': 'pointerEvents',
  'shape-rendering': 'shapeRendering', 'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity', 'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset', 'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin', 'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-opacity': 'strokeOpacity', 'stroke-width': 'strokeWidth',
  'text-anchor': 'textAnchor', 'text-decoration': 'textDecoration',
  'text-rendering': 'textRendering', 'transform-origin': 'transformOrigin',
  'word-spacing': 'wordSpacing', 'writing-mode': 'writingMode',
  'xlink:href': 'xlinkHref', 'xlink:title': 'xlinkTitle',
  'xml:lang': 'xmlLang', 'xml:space': 'xmlSpace',
};

/* ================================================================
 *  智能属性设置
 * ================================================================ */

/**
 * 智能设置 DOM 属性
 *
 * 根据属性类型选择最优的设置方式：
 *   - class → el.className
 *   - style → el.style.cssText（字符串）或逐项设置（对象）
 *   - 事件（on* / @*）→ 通过事件系统处理
 *   - 布尔属性 → el[key] = value 或 el.removeAttribute(key)
 *   - DOM property → el[key] = value
 *   - 其他 → el.setAttribute(key, value)
 *
 * @param el    DOM 元素
 * @param key   属性名
 * @param value 属性值
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setDOMProp(el: any, key: string, value: any): void {
  // class 特殊处理
  if (key === 'class') {
    el.className = value === null || value === undefined ? '' : String(value);
    return;
  }

  // style 特殊处理
  if (key === 'style') {
    if (typeof value === 'string') {
      el.style.cssText = value;
    } else if (value !== null && value !== undefined && typeof value === 'object') {
      // 对象形式：逐项设置
      for (const styleKey in value) {
        el.style[styleKey] = value[styleKey];
      }
    } else {
      el.style.cssText = '';
    }
    return;
  }

  // 事件属性特殊处理（on* 或 @*）
  if (key.startsWith('on') || key.startsWith('@')) {
    // 事件由 patch-events 模块处理，此处仅做基本绑定
    const eventName = key.startsWith('@')
      ? key.slice(1).toLowerCase()
      : key.slice(2).toLowerCase();
    if (typeof value === 'function') {
      el.addEventListener(eventName, value);
    }
    return;
  }

  // 布尔属性处理
  if (key in BOOLEAN_ATTRS) {
    if (value) {
      el.setAttribute(key, '');
      // 同时设置 property（某些场景需要）
      if (key in el) {
        el[key] = true;
      }
    } else {
      el.removeAttribute(key);
      if (key in el) {
        el[key] = false;
      }
    }
    return;
  }

  // DOM property 处理
  // 检查属性名是否在 DOM_PROPS 映射中，或者元素上是否存在该 property
  const propKey = DOM_PROPS[key] || key;
  if (propKey in el) {
    // 使用 property 设置
    try {
      el[propKey] = value === null || value === undefined ? '' : value;
    } catch (e) {
      // 只读属性会抛出异常，回退到 setAttribute
      console.warn(`[Lyt DOM] 设置属性 "${key}" 失败（只读属性），回退到 setAttribute:`, e instanceof Error ? e.message : e);
      el.setAttribute(key, value === null || value === undefined ? '' : String(value));
    }
    return;
  }

  // 默认使用 setAttribute
  if (value === null || value === undefined || value === false) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, String(value));
  }
}

/**
 * 移除 DOM 属性
 *
 * 根据属性类型选择正确的移除方式：
 *   - class → el.className = ''
 *   - style → el.style.cssText = ''
 *   - 事件 → el.removeEventListener
 *   - 布尔属性 → el.removeAttribute + el[key] = false
 *   - DOM property → el[key] = ''
 *   - 其他 → el.removeAttribute
 *
 * @param el  DOM 元素
 * @param key 属性名
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function removeDOMProp(el: any, key: string): void {
  // class 特殊处理
  if (key === 'class') {
    el.className = '';
    return;
  }

  // style 特殊处理
  if (key === 'style') {
    el.style.cssText = '';
    return;
  }

  // 事件属性特殊处理
  if (key.startsWith('on') || key.startsWith('@')) {
    // 事件移除由 patch-events 模块处理
    const eventName = key.startsWith('@')
      ? key.slice(1).toLowerCase()
      : key.slice(2).toLowerCase();
    // 尝试从缓存中获取并移除
    const invokers = el._vei;
    if (invokers) {
      const eventKey = 'on' + eventName.charAt(0).toUpperCase() + eventName.slice(1);
      const invoker = invokers[eventKey];
      if (invoker) {
        el.removeEventListener(eventName, invoker);
        invokers[eventKey] = undefined;
      }
    }
    return;
  }

  // 布尔属性处理
  if (key in BOOLEAN_ATTRS) {
    el.removeAttribute(key);
    if (key in el) {
      el[key] = false;
    }
    return;
  }

  // DOM property 处理
  const propKey = DOM_PROPS[key] || key;
  if (propKey in el) {
    try {
      el[propKey] = '';
    } catch (e) {
      // 只读属性回退到 removeAttribute
      console.warn(`[Lyt DOM] 移除属性 "${key}" 失败（只读属性），回退到 removeAttribute:`, e instanceof Error ? e.message : e);
      el.removeAttribute(key);
    }
    return;
  }

  // 默认使用 removeAttribute
  el.removeAttribute(key);
}

/* ================================================================
 *  属性 Diff 更新
 * ================================================================ */

/**
 * 判断一个 key 是否为事件属性
 *
 * @param key 属性名
 * @returns 是否为事件属性
 */
function isEventKey(key: string): boolean {
  return key.startsWith('on') || key.startsWith('@');
}

/**
 * Diff 更新 DOM 属性
 *
 * 对比新旧 props，只更新变化的部分：
 *   1. 遍历新 props，更新值发生变化的属性
 *   2. 遍历旧 props，移除在新 props 中不存在的属性
 *
 * @param el       DOM 元素
 * @param oldProps 旧属性对象
 * @param newProps 新属性对象
 */
export function patchDOMProps(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  el: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldProps: Record<string, any> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newProps: Record<string, any> | null
): void {
  const oldKeys = oldProps ? Object.keys(oldProps) : [];
  const newKeys = newProps ? Object.keys(newProps) : [];

  // 遍历新 props，更新变化的属性
  for (let i = 0; i < newKeys.length; i++) {
    const key = newKeys[i];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const newValue = newProps![key];
    const oldValue = oldProps ? oldProps[key] : undefined;

    // 跳过 key 和 ref（它们不属于 DOM 属性）
    if (key === 'key' || key === 'ref') {
      continue;
    }

    // 值未变化，跳过
    if (newValue === oldValue) {
      continue;
    }

    // 特殊属性单独处理
    if (key === 'class') {
      // class 由 patch-props 模块的 patchClass 处理
      el.className = newValue === null || newValue === undefined ? '' : String(newValue);
    } else if (key === 'style') {
      // style 由 patch-props 模块的 patchStyle 处理
      patchStyleInline(el, newValue, oldValue);
    } else if (isEventKey(key)) {
      // 事件由 patch-events 模块处理
      // 此处不处理，留给上层调用
    } else {
      setDOMProp(el, key, newValue);
    }
  }

  // 遍历旧 props，移除在新 props 中不存在的属性
  for (let i = 0; i < oldKeys.length; i++) {
    const key = oldKeys[i];

    // 跳过 key 和 ref
    if (key === 'key' || key === 'ref') {
      continue;
    }

    // 如果新 props 中没有这个 key
    if (!newProps || !(key in newProps)) {
      if (key === 'class') {
        el.className = '';
      } else if (key === 'style') {
        el.style.cssText = '';
      } else if (isEventKey(key)) {
        // 事件移除由 patch-events 模块处理
      } else {
        removeDOMProp(el, key);
      }
    }
  }
}

/**
 * 内联 style 更新
 *
 * @param el        DOM 元素
 * @param newStyle  新的 style 值（字符串或对象）
 * @param oldStyle  旧的 style 值（字符串或对象）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function patchStyleInline(el: any, newStyle: any, oldStyle: any): void {
  if (!newStyle || (typeof newStyle === 'string' && !newStyle.trim())) {
    el.style.cssText = '';
    return;
  }

  if (typeof newStyle === 'string') {
    el.style.cssText = newStyle;
    return;
  }

  // 对象形式：逐项对比
  if (typeof oldStyle === 'object' && oldStyle !== null) {
    // 移除旧 style 中存在但新 style 中不存在的属性
    for (const key in oldStyle) {
      if (!(key in newStyle)) {
        el.style[key] = '';
      }
    }
  }

  // 设置新 style
  for (const key in newStyle) {
    el.style[key] = newStyle[key];
  }
}

/* ================================================================
 *  SVG 命名空间辅助
 * ================================================================ */

/**
 * 判断一个标签名是否为 SVG 元素
 *
 * @param tag 标签名
 * @returns 是否为 SVG 元素
 */
export function isSVGElement(tag: string): boolean {
  return (
    tag === 'svg' || tag === 'path' || tag === 'circle' || tag === 'rect' ||
    tag === 'line' || tag === 'polyline' || tag === 'polygon' || tag === 'ellipse' ||
    tag === 'g' || tag === 'defs' || tag === 'use' || tag === 'text' || tag === 'tspan' ||
    tag === 'clipPath' || tag === 'mask' || tag === 'filter' ||
    tag === 'linearGradient' || tag === 'radialGradient' || tag === 'stop' ||
    tag === 'pattern' || tag === 'symbol' || tag === 'image' || tag === 'foreignObject' ||
    tag === 'animate' || tag === 'animateTransform' || tag === 'animateMotion'
  );
}

/**
 * 获取 SVG 属性名
 *
 * 将 kebab-case 的 SVG 属性名转换为 camelCase 的 DOM property 名
 *
 * @param attr kebab-case 属性名
 * @returns camelCase 属性名
 */
export function getSVGPropName(attr: string): string {
  return SVG_ATTRS[attr] || attr;
}
