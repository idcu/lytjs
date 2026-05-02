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
    // Valid VNode object
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
