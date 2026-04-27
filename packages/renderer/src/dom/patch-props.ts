/**
 * Lyt.js 渲染器 — 属性精确更新
 *
 * 本模块基于 PatchFlag 实现属性的精确更新，避免全量 diff。
 * 当编译器标记了 VNode 的 patchFlag 后，运行时只需更新标记的属性，
 * 大幅减少不必要的 DOM 操作。
 *
 * 提供的更新函数：
 *   - patchClass(el, next, prev)        — class 属性更新
 *   - patchStyle(el, next, prev)        — style 属性更新
 *   - patchEvent(el, next, prev, instance) — 事件更新
 *   - patchDOMProp(el, key, next, prev) — DOM 属性更新
 *   - patchProp(el, key, next, prev, instance) — 统一属性更新入口
 */

import { patchEvent } from './patch-events';
import { PatchFlags } from '@lytjs/vdom';

// Re-export PatchFlags for consumers
export { PatchFlags };

/* ================================================================
 *  class 更新
 * ================================================================ */

/**
 * 更新元素的 class 属性
 *
 * 支持多种形式的 class 值：
 *   - 字符串：'foo bar baz'
 *   - 对象：{ foo: true, bar: false, baz: true }
 *   - 数组：['foo', 'bar', { baz: true }]
 *   - null/undefined：清空 class
 *
 * @param el   DOM 元素
 * @param next 新的 class 值
 * @param prev 旧的 class 值（可选，用于优化）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function patchClass(el: any, next: any, prev?: any): void {
  // 将各种形式的 class 值规范化为字符串
  const nextClass = normalizeClass(next);

  if (nextClass !== prev) {
    el.className = nextClass;
  }
}

/**
 * 规范化 class 值为字符串
 *
 * @param value class 值（字符串、对象、数组、null/undefined）
 * @returns 规范化后的 class 字符串
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeClass(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      // 数组形式：递归规范化每个元素
      let result = '';
      for (let i = 0; i < value.length; i++) {
        const normalized = normalizeClass(value[i]);
        if (normalized) {
          result += (result ? ' ' : '') + normalized;
        }
      }
      return result;
    }

    // 对象形式：收集值为 truthy 的 key
    let result = '';
    for (const key in value) {
      if (value[key]) {
        result += (result ? ' ' : '') + key;
      }
    }
    return result;
  }

  return String(value);
}

/* ================================================================
 *  style 更新
 * ================================================================ */

/**
 * 更新元素的 style 属性
 *
 * 支持两种形式：
 *   - 字符串：'color: red; font-size: 14px'
 *   - 对象：{ color: 'red', fontSize: '14px' }
 *
 * 更新策略：
 *   - 新旧都是字符串 → 直接替换 cssText
 *   - 新旧都是对象 → 逐项 diff，只更新变化的部分
 *   - 类型不同 → 清空旧值，设置新值
 *   - 新值为 null → 清空 style
 *
 * @param el   DOM 元素
 * @param next 新的 style 值
 * @param prev 旧的 style 值（可选）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function patchStyle(el: any, next: any, prev?: any): void {
  // 新值为 null/undefined → 清空 style
  if (!next) {
    el.style.cssText = '';
    return;
  }

  // 旧值为 null/undefined → 直接设置新值
  if (!prev) {
    if (typeof next === 'string') {
      el.style.cssText = next;
    } else if (typeof next === 'object') {
      setStyleObject(el, next);
    }
    return;
  }

  // 新旧类型不同 → 清空旧值，设置新值
  if (typeof next !== typeof prev) {
    el.style.cssText = '';
    if (typeof next === 'string') {
      el.style.cssText = next;
    } else if (typeof next === 'object') {
      setStyleObject(el, next);
    }
    return;
  }

  // 新旧都是字符串 → 直接替换
  if (typeof next === 'string') {
    if (next !== prev) {
      el.style.cssText = next;
    }
    return;
  }

  // 新旧都是对象 → 逐项 diff
  if (typeof next === 'object' && typeof prev === 'object') {
    // 移除旧 style 中存在但新 style 中不存在的属性
    for (const key in prev) {
      if (!(key in next)) {
        el.style[key] = '';
      }
    }

    // 设置新 style 中变化或新增的属性
    for (const key in next) {
      const nextVal = next[key];
      const prevVal = prev[key];

      if (nextVal !== prevVal) {
        el.style[key] = nextVal === null || nextVal === undefined ? '' : nextVal;
      }
    }
  }
}

/**
 * 批量设置 style 对象
 *
 * @param el    DOM 元素
 * @param style style 对象
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setStyleObject(el: any, style: Record<string, any>): void {
  for (const key in style) {
    el.style[key] = style[key] === null || style[key] === undefined ? '' : style[key];
  }
}

/* ================================================================
 *  事件更新
 * ================================================================ */

/**
 * 更新元素的事件监听
 *
 * 委托给 patch-events 模块的 patchEvent 函数。
 * 此处提供统一的接口，与 class/style/DOMProp 保持一致的调用签名。
 *
 * @param el       DOM 元素
 * @param next     新的事件处理函数
 * @param prev     旧的事件处理函数（可选）
 * @param instance 组件实例（可选）
 */
export function patchEventOnElement(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  el: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  next: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prev?: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance?: any
): void {
  // next 和 prev 需要从 key 中提取事件名
  // 但此函数的调用场景中，事件名已由上层传入
  // 此处直接使用 patchEvent
  patchEvent(el, '', next, prev, instance);
}

/* ================================================================
 *  DOM 属性更新
 * ================================================================ */

/**
 * 需要跳过的属性名集合
 * 这些属性由专门的函数处理，不在此处处理
 */
const SKIP_PROPS = new Set(['class', 'style', 'key', 'ref']);

/**
 * 判断一个 key 是否为事件属性
 *
 * @param key 属性名
 * @returns 是否为事件属性
 */
function isEventProp(key: string): boolean {
  return key.length > 2 && (key[0] === 'o' || key[0] === 'O' || key[0] === '@') &&
    (key[1] === 'n' || key[1] === 'N');
}

/**
 * 更新单个 DOM 属性
 *
 * 根据属性类型分发到不同的处理逻辑：
 *   - class → patchClass
 *   - style → patchStyle
 *   - 事件 → patchEvent
 *   - 其他 → setAttribute / el[key] = value
 *
 * @param el       DOM 元素
 * @param key      属性名
 * @param next     新值
 * @param prev     旧值（可选）
 * @param instance 组件实例（可选）
 */
export function patchDOMProp(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  el: any,
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  next: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prev?: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance?: any
): void {
  // 跳过特殊属性
  if (SKIP_PROPS.has(key)) {
    return;
  }

  // 事件处理
  if (isEventProp(key)) {
    patchEvent(el, key, next, prev, instance);
    return;
  }

  // 布尔属性处理
  if (next === false || next === null || next === undefined) {
    el.removeAttribute(key);
    return;
  }

  // 普通 DOM 属性
  // 优先使用 property 设置，回退到 attribute
  if (key in el) {
    try {
      el[key] = next;
    } catch {
      el.setAttribute(key, String(next));
    }
  } else {
    el.setAttribute(key, String(next));
  }
}

/* ================================================================
 *  统一属性更新入口
 * ================================================================ */

/**
 * 统一的属性更新入口
 *
 * 根据 key 的类型自动分发到对应的更新函数。
 * 这是 patchElement 中更新单个 prop 的核心函数。
 *
 * @param el       DOM 元素
 * @param key      属性名
 * @param next     新值
 * @param prev     旧值（可选）
 * @param instance 组件实例（可选）
 */
export function patchProp(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  el: any,
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  next: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prev?: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance?: any
): void {
  patchDOMProp(el, key, next, prev, instance);
}

/* ================================================================
 *  全量属性更新
 * ================================================================ */

/**
 * 全量对比并更新所有属性
 *
 * 当 VNode 没有 patchFlag 或 patchFlag 包含 FULL_PROPS 时使用。
 * 遍历新旧 props，更新变化的部分，移除删除的部分。
 *
 * @param el       DOM 元素
 * @param oldProps 旧属性对象
 * @param newProps 新属性对象
 * @param instance 组件实例（可选）
 */
export function patchAllProps(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  el: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldProps: Record<string, any> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newProps: Record<string, any> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance?: any
): void {
  // 遍历新 props，更新变化的属性
  if (newProps) {
    for (const key in newProps) {
      // 跳过 key 和 ref
      if (key === 'key' || key === 'ref') {
        continue;
      }

      const next = newProps[key];
      const prev = oldProps ? oldProps[key] : undefined;

      if (next !== prev) {
        patchProp(el, key, next, prev, instance);
      }
    }
  }

  // 遍历旧 props，移除在新 props 中不存在的属性
  if (oldProps) {
    for (const key in oldProps) {
      // 跳过 key 和 ref
      if (key === 'key' || key === 'ref') {
        continue;
      }

      // 如果新 props 中没有这个 key
      if (!newProps || !(key in newProps)) {
        patchProp(el, key, null, oldProps[key], instance);
      }
    }
  }
}

/* ================================================================
 *  基于 PatchFlag 的精确属性更新
 * ================================================================ */

/**
 * 基于 PatchFlag 精确更新元素属性
 *
 * 根据 VNode 的 patchFlag 只更新标记为动态的属性：
 *   - CLASS → 只更新 class
 *   - STYLE → 只更新 style
 *   - TEXT  → 只更新文本内容
 *   - PROPS → 只更新 dynamicProps 中指定的属性
 *   - FULL_PROPS → 全量 diff
 *
 * @param el           DOM 元素
 * @param oldVNode     旧 VNode
 * @param newVNode     新 VNode
 * @param instance     组件实例（可选）
 */
export function patchElementProps(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  el: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldVNode: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newVNode: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance?: any
): void {
  const oldProps = oldVNode.props || {};
  const newProps = newVNode.props || {};
  const { patchFlag, dynamicProps } = newVNode;

  // 无 patchFlag → 全量 diff
  if (!patchFlag || patchFlag === PatchFlags.HOISTED) {
    patchAllProps(el, oldProps, newProps, instance);
    return;
  }

  // BAIL → 退出优化，全量 diff
  if (patchFlag === PatchFlags.BAIL) {
    patchAllProps(el, oldProps, newProps, instance);
    return;
  }

  // TEXT 标记 → 只更新文本内容
  if (patchFlag & PatchFlags.TEXT) {
    if (oldVNode.children !== newVNode.children) {
      el.textContent = newVNode.children;
    }
  }

  // CLASS 标记 → 只更新 class
  if (patchFlag & PatchFlags.CLASS) {
    if (oldProps.class !== newProps.class) {
      patchClass(el, newProps.class, oldProps.class);
    }
  }

  // STYLE 标记 → 只更新 style
  if (patchFlag & PatchFlags.STYLE) {
    if (oldProps.style !== newProps.style) {
      patchStyle(el, newProps.style, oldProps.style);
    }
  }

  // PROPS 标记 → 只更新 dynamicProps 中指定的属性
  if (patchFlag & PatchFlags.PROPS) {
    if (dynamicProps) {
      for (let i = 0; i < dynamicProps.length; i++) {
        const key = dynamicProps[i];
        const prev = oldProps[key];
        const next = newProps[key];

        if (next !== prev) {
          patchProp(el, key, next, prev, instance);
        }
      }
    }
  }

  // FULL_PROPS 标记 → 全量 diff
  if (patchFlag & PatchFlags.FULL_PROPS) {
    patchAllProps(el, oldProps, newProps, instance);
  }
}
