/**
 * @lytjs/vdom - render-helpers
 * 编译器产物所需的 **渲染期 helper 集合**
 *
 * ## 为什么有这个文件
 *
 * 编译器（`@lytjs/compiler`）通过 `helperNameMap` 约定了一组运行时导出名，
 * 并把它们写进产物的 import 语句，例如：
 * ```js
 * import { toDisplayString, createBlock, openBlock, renderList } from '@lytjs/core';
 * ```
 *
 * 但 2026-09-26 的契约审计（`scripts/check-runtime-contract.ts`）实测：
 * **其中 9 个名字在任何运行时包里都不存在** ——
 * `toDisplayString` / `createElementVNode` / `createStaticVNode` / `setBlockTracking`
 * / `renderList` / `normalizeProps` / `guardReactiveProps` / `toHandlerKey` / `withCtx`。
 *
 * 后果是双重的：产物既 import 不到（ESM 具名导入失败），又无从执行。
 * 本文件把这 9 个 helper 按真实语义补齐，作为「编译期 ↔ 运行期契约」的运行期一侧。
 *
 * ⚠️ 维护约定：**改动 `compiler/src/constants.ts` 的 `helperNameMap` 时，
 * 必须同步在此处（或 vdom 其它文件）提供实现**，否则契约守卫会 FAIL。
 */

import type { VNode, VNodeChildren, VNodeTypes } from '@lytjs/common-vnode';
import { Fragment } from '@lytjs/common-vnode';
import { isArray } from '@lytjs/common-is';
import { capitalize } from '@lytjs/common-string';
import { createVNode, createTextVNode } from './vnode';
import { setBlockTracking } from './block';

// ============================================================
// createElementVNode —— 元素 VNode 创建（createVNode 的元素语义别名）
// ============================================================

/**
 * 创建元素 VNode。
 *
 * 编译器对**元素**统一生成 `createElementVNode(...)`（见 helperNameMap 的
 * `CREATE_VNODE` / `CREATE_ELEMENT_VNODE` 两项）。运行时它与 `createVNode` 同义，
 * 保留独立名字是为了让产物可读、并给未来「元素专属 props 归一化」留出位置。
 */
export function createElementVNode(
  type: VNodeTypes,
  props?: Record<string, unknown> | null,
  children?: VNodeChildren,
  patchFlag?: number,
  dynamicProps?: string[] | null,
  isBlockNode?: boolean,
): VNode {
  return createVNode(type, props ?? null, children ?? null, patchFlag ?? 0, dynamicProps ?? null, isBlockNode ?? false);
}

// ============================================================
// createStaticVNode —— 静态内容节点
// ============================================================

/**
 * 创建静态 VNode（内容在编译期已确定、运行期不参与 diff）。
 *
 * 当前 codegen 尚未生成 `CREATE_STATIC`（helperNameMap 中已预留），
 * 这里按 Vue 的语义给出可工作的实现：把静态内容包成一个 Fragment，
 * 以便 `patchStatic` 之类按整体跳过的优化将来可以接入。
 */
export function createStaticVNode(content: string, numberOfNodes = 1): VNode {
  const children: VNode[] = [];
  if (numberOfNodes <= 1) {
    children.push(createTextVNode(content));
  } else {
    // 多节点静态内容：按空白切分近似还原（编译器传入的 content 是其拼接结果）
    const parts = content.split(/\s{2,}/).filter(Boolean);
    const count = Math.max(numberOfNodes, parts.length);
    for (let i = 0; i < count; i++) {
      children.push(createTextVNode(parts[i] ?? ''));
    }
  }
  const vnode = createVNode(Fragment, null, children, 0, null, false);
  // 标记为静态，供 patch 阶段整体跳过
  (vnode as VNode & { isStatic?: boolean }).isStatic = true;
  return vnode;
}

// ============================================================
// renderList —— v-for 的列表渲染
// ============================================================

/**
 * 按 `source` 的形状渲染列表（v-for 的运行时实现）。
 *
 * 与 Vue 的 `renderList` 语义一致，覆盖四种 source：
 * 数组 / 字符串、数字（1..n）、对象（键值对）、其它（空数组）。
 */
export function renderList<T, R>(
  source: readonly T[] | string | number | Record<string, T> | null | undefined,
  renderItem: (value: T, key: string | number, index: number) => R,
): R[] {
  let ret: R[];

  if (isArray(source) || typeof source === 'string') {
    const list = source as readonly T[] | string;
    ret = new Array(list.length) as R[];
    for (let i = 0, l = list.length; i < l; i++) {
      ret[i] = renderItem(list[i] as T, i, i);
    }
  } else if (typeof source === 'number') {
    ret = new Array(source) as R[];
    for (let i = 0; i < source; i++) {
      ret[i] = renderItem((i + 1) as unknown as T, i + 1, i);
    }
  } else if (typeof source === 'object' && source !== null) {
    const record = source as Record<string, T>;
    const keys = Object.keys(record);
    ret = new Array(keys.length) as R[];
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i]!;
      ret[i] = renderItem(record[key]!, key, i);
    }
  } else {
    ret = [] as R[];
  }

  // 与 Vue 一致：给结果数组打上标记，便于渲染器识别「来自 renderList 的列表」
  (ret as R[] & { _isVList?: boolean })._isVList = true;
  return ret;
}

// ============================================================
// toDisplayString —— 插值格式化
// ============================================================

/** 需要原样字符串化的内建对象（避免 JSON.stringify 得到 `{}`） */
const OBJECT_STRINGIFY = /\[object (Map|Set|RegExp)\]/;

function stringifyReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Map || value instanceof Set) return Array.from(value as Iterable<unknown>);
  return value;
}

/**
 * 把任意值格式化为可显示字符串（插值 `{{ x }}` 的运行时实现）。
 *
 * 与 Vue 的 `toDisplayString` 对齐：`null` / `undefined` → 空串，
 * 字符串原样，对象 JSON 化（带 symbol / bigint / Map / Set 兜底），
 * 其余 `String(x)`。
 */
export function toDisplayString(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    const tag = Object.prototype.toString.call(val);
    if (OBJECT_STRINGIFY.test(tag) || isArray(val)) {
      try {
        return JSON.stringify(val, stringifyReplacer);
      } catch {
        return String(val);
      }
    }
    try {
      return JSON.stringify(val, stringifyReplacer, 2);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

// ============================================================
// props 归一化
// ============================================================

/**
 * 归一化 props 对象。
 *
 * ⚠️ 与 Vue 的差异（有意）：Vue 会返回 `shallowReadonly(props)` 以冻结外部写入。
 * 本项目的 `@lytjs/vdom` **不依赖 `@lytjs/reactivity`**（保持渲染层零交叉依赖），
 * 因此这里只做「确保是普通对象」的归一化。若将来需要只读语义，
 * 应由调用方（component 层）在传入前完成。
 */
export function normalizeProps(
  props: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (props === null || props === undefined) return null;
  return props;
}

/**
 * 防响应式 props 泄漏。
 *
 * 若 props 本身是响应式代理（带 `__v_isReactive` 标记），浅拷贝一份再交给
 * vnode，避免把整个响应式对象挂到 vnode 上、在 patch 时触发额外依赖收集。
 * 非代理对象原样返回（零开销）。
 */
export function guardReactiveProps(
  props: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (props === null || props === undefined) return null;
  const flag = (props as Record<string, unknown>).__v_isReactive;
  if (flag === true || flag === 1) {
    return { ...props };
  }
  return props;
}

// ============================================================
// toHandlerKey —— 事件名 → prop 键
// ============================================================

/**
 * 事件名转 props 键：`click` → `onClick`、`update:modelValue` → `onUpdate:modelValue`。
 *
 * 与 `@lytjs/component` 的 `emit()` / `toHandlerKey()` 必须保持一致
 * （两侧同时改，否则组件事件收不到）。
 */
export function toHandlerKey(str: string): string {
  return str ? `on${capitalize(str)}` : '';
}

// ============================================================
// createSlots —— 具名插槽合并
// ============================================================

/**
 * 合并具名插槽对象（`v-slot` / `#name` 的运行时实现）。
 *
 * 契约来源：`helperNameMap.CREATE_SLOTS`。当前 codegen 尚未生成对它的调用，
 * 但它是声明式契约的一部分，故一并补齐，避免将来 codegen 用到时才发现运行期为空。
 *
 * @param slots        基础插槽对象（通常来自父级传入）
 * @param dynamicSlots 动态插槽描述数组：既可能是单个 `{ name, fn, key? }`，
 *                     也可能是它们的数组（`<template #a>` + `<template #b>` 合并）
 */
export function createSlots(
  slots: Record<string, unknown>,
  dynamicSlots: Array<
    { name: string; fn: unknown; key?: unknown } | { name: string; fn: unknown }[] | null | undefined
  >,
): Record<string, unknown> {
  for (let i = 0; i < dynamicSlots.length; i++) {
    const slot = dynamicSlots[i];
    if (isArray(slot)) {
      for (const item of slot) {
        if (item && item.name) slots[item.name] = item.fn;
      }
    } else if (slot && slot.name) {
      slots[slot.name] = slot.fn;
    }
  }
  return slots;
}

// ============================================================
// withCtx —— slot 渲染的 block 隔离
// ============================================================

/**
 * 包装 slot 渲染函数，在调用期间**关闭 block 追踪**。
 *
 * 语义与 Vue 的 `withCtx` 一致：slot 内容属于子组件的渲染边界，
 * 若其动态节点被收集进父组件当前 block 的 `dynamicChildren`，
 * patch 时会按父级结构去访问不存在的子节点 ⇒ 越界 / 静默错渲。
 * 通过 `setBlockTracking(-1)` 隔离，退出时恢复。
 */
export function withCtx<T extends (...args: never[]) => unknown>(fn: T): T {
  const wrapper = function (this: unknown, ...args: never[]) {
    setBlockTracking(-1);
    try {
      return fn.apply(this, args);
    } finally {
      setBlockTracking(1);
    }
  };
  return wrapper as unknown as T;
}
