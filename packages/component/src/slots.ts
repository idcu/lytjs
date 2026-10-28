// src/slots.ts
// 插槽处理

import { isFunction, isArray, isObject, isNullish } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import type { VNode } from '@lytjs/common-vnode';
import { createTextVNode } from '@lytjs/vdom';
import type { ComponentInternalInstance, InternalSlots, SlotFunction } from './types';

/**
 * 从 children 初始化 slots。
 * Children 可以是：
 * - 插槽函数对象（命名插槽）
 * - 单个函数（默认插槽）
 * - null/undefined（无插槽）
 *
 * FIX: P2-20 动态 slot 缓存策略：
 * slots 在初始化时被规范化并存储在 instance.slots 中。
 * 如果需要动态更新 slots（如通过 scoped slots），应通过
 * 组件更新机制触发重新初始化，而非直接修改 instance.slots。
 */
/**
 * 把插槽函数的返回值**统一规范化为数组**。
 *
 * ⚠️ 2026-10-27 修（P0）：`slots.default()` 的契约允许返回**单个 VNode**，
 *   但组件里普遍写 `children.push(...slots.default())` —— 返回单 vnode 时
 *   `...vnode` 直接抛 `Spread syntax requires ...iterable[Symbol.iterator]`。
 *   实测 Modal 在 `<Modal><input/></Modal>`（单子节点）下**整棵渲染崩溃**，
 *   而既有测试都传数组，所以一直没被发现。
 *
 *   在 `initSlots` 这一层统一包装，是唯一能一次性覆盖所有 `...slots.x()` 写法的位置。
 */
function wrapSlot(fn: SlotFunction): SlotFunction {
  return ((...args: unknown[]) =>
    normalizeSlotValue((fn as (...a: unknown[]) => unknown)(...args))) as SlotFunction;
}

export function initSlots(instance: ComponentInternalInstance, children: unknown): void {
  if (isNullish(children)) {
    instance.slots = {} as InternalSlots;
    return;
  }

  const slots: InternalSlots = {};

  if (isFunction(children)) {
    // 单个函数 => 默认插槽
    slots.default = wrapSlot(children as SlotFunction);
  } else if (isArray(children) || (children as VNode).__v_isVNode === true) {
    // ★ 2026-10-02 新增：**VNode / VNode[]** —— 这是**模板编译产物最常见的形态**，
    //   此前完全没有分支（数组落空、单个 vnode 被当成「插槽名字典」逐 key 遍历），
    //   ⇒ `slots.default` **从未建立** ⇒ 组件里 `slots.default?.()` 得到 undefined
    //   ⇒ 渲染函数返回 undefined ⇒ vdom `update()` 里 `vnode.el = subTree.el` 抛
    //   `Cannot read properties of undefined (reading 'el')`。
    //   实测触发：`<Transition><div/></Transition>`（模板）与
    //   `h(Transition, null, h('div'))`（单个子 vnode）；而
    //   `h(Transition, null, { default: () => [...] })`（显式 slots）一直正常。
    const list = (isArray(children) ? children : [children]) as VNode[];
    slots.default = (() => list) as unknown as SlotFunction;
  } else if (typeof children === 'string' || typeof children === 'number') {
    // ★ 2026-10-28 修（P0）：**纯文本子节点**。
    //
    // 编译器对 `<Child>hello</Child>` 产出的是 `createElementVNode(_ctx.Child, null, "hello")`
    // —— children 是一个**字符串**，而下面的分支只认「函数 / 数组 / vnode / 函数对象」，
    // 字符串一个都不匹配 ⇒ `slots.default` **从未建立** ⇒ 组件里 `slots.default?.()`
    // 得到 undefined ⇒ 文本整块消失（不报错、不告警）。
    //
    // 实测对照（同一子组件）：
    //   `<Child><span>S</span></Child>`  → 渲染出 S（走数组/vnode 分支）
    //   `<Child>hello</Child>`           → **什么都不渲染**（本条）
    // 而「文本 + 元素混排」是数组形态、一直正常 —— 又一次「一半能用」。
    slots.default = (() => [createTextVNode(String(children))]) as unknown as SlotFunction;
  } else if (isObject(children) && !isArray(children)) {
    // 插槽函数对象
    const slotObj = children as Record<string, unknown>;
    for (const key in slotObj) {
      if (isFunction(slotObj[key])) {
        slots[key] = wrapSlot(slotObj[key] as SlotFunction);
      }
    }
  }

  instance.slots = slots;
}

/**
 * 将插槽返回值规范化为数组。
 * 确保插槽函数始终返回数组，以保持渲染一致性。
 */
export function normalizeSlotValue(value: unknown): VNode[] {
  if (isNullish(value)) return [];
  if (isArray(value)) return value as VNode[];
  // FIX: P2-13 简化检查逻辑，直接检查 __v_isVNode === true
  // 避免多余的类型检查和嵌套条件
  if ((value as VNode).__v_isVNode === true) {
    return [value as VNode];
  }
  if (__DEV__) {
    warn(
      `normalizeSlotValue: expected VNode or VNode[], got ${typeof value}. ` +
        `This may cause rendering issues.`,
    );
  }
  return [value as VNode];
}

/**
 * 渲染插槽
 *
 * 这是模板编译产物 `<slot>` 所依赖的运行时入口（编译器会生成
 * `renderSlot(_ctx.$slots, "name", props, fallback)`）。
 *
 * 契约：
 * - `slots` 为组件实例的 `$slots`（由 initSlots 规范化），可能为 undefined
 * - 插槽函数返回 VNode / VNode[]，统一规范化为 VNode[]
 * - 无对应插槽时返回 `fallback`（缺省 `[]`，即渲染为空）
 *
 * @param slots  插槽表
 * @param name   插槽名
 * @param props  传给作用域插槽的参数
 * @param fallback 无插槽时的回退内容
 */
export function renderSlot(
  slots: Record<string, SlotFunction> | undefined | null,
  name: string,
  props: Record<string, unknown> = {},
  fallback?: VNode | VNode[],
): VNode[] {
  const slot = slots?.[name];
  if (isFunction(slot)) {
    return normalizeSlotValue((slot as SlotFunction)(props));
  }
  if (fallback === undefined) return [];
  return normalizeSlotValue(fallback);
}
