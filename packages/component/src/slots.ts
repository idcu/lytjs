// src/slots.ts
// 插槽处理

import { isFunction, isArray, isObject, isNullish } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import type { VNode } from '@lytjs/common-vnode';
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
export function initSlots(instance: ComponentInternalInstance, children: unknown): void {
  if (isNullish(children)) {
    instance.slots = {} as InternalSlots;
    return;
  }

  const slots: InternalSlots = {};

  if (isFunction(children)) {
    // 单个函数 => 默认插槽
    slots.default = children as SlotFunction;
  } else if (isObject(children) && !isArray(children)) {
    // 插槽函数对象
    const slotObj = children as Record<string, unknown>;
    for (const key in slotObj) {
      if (isFunction(slotObj[key])) {
        slots[key] = slotObj[key] as SlotFunction;
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
