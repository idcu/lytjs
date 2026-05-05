// src/slots.ts
// Slot handling

import { isFunction, isArray, isObject, isNullish } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import type { VNode } from '@lytjs/common-vnode';
import type { ComponentInternalInstance, InternalSlots, SlotFunction } from './types';

/**
 * Initialize slots from children.
 * Children can be:
 * - An object of slot functions (named slots)
 * - A single function (default slot)
 * - null/undefined (no slots)
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
    // Single function => default slot
    slots.default = children as SlotFunction;
  } else if (isObject(children) && !isArray(children)) {
    // Object of slot functions
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
 * Normalize slot return value to an array.
 * Ensures slot functions always return arrays for consistent rendering.
 */
export function normalizeSlotValue(value: unknown): VNode[] {
  if (isNullish(value)) return [];
  if (isArray(value)) return value as VNode[];
  if (isObject(value) && value !== null && typeof (value as VNode).__v_isVNode === 'boolean') {
    // FIX: P1-23 将 typeof === 'boolean' 检查改为 === true，
    // 避免在 __v_isVNode 为其他 falsy 值（如 0、''、null）时误判为有效 VNode
    if ((value as VNode).__v_isVNode === true) {
      // Valid VNode object
      return [value as VNode];
    }
  }
  if (__DEV__) {
    warn(
      `normalizeSlotValue: expected VNode or VNode[], got ${typeof value}. ` +
        `This may cause rendering issues.`,
    );
  }
  return [value as VNode];
}
