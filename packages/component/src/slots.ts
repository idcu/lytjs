// src/slots.ts
// Slot handling

import { isFunction, isArray, isObject, isNullish } from "@lytjs/common-is";
import type { VNode } from "@lytjs/vdom";
import type {
  ComponentInternalInstance,
  InternalSlots,
  SlotFunction,
} from "./types";

/**
 * Initialize slots from children.
 * Children can be:
 * - An object of slot functions (named slots)
 * - A single function (default slot)
 * - null/undefined (no slots)
 */
export function initSlots(
  instance: ComponentInternalInstance,
  children: any,
): void {
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
    for (const key in children) {
      if (isFunction(children[key])) {
        slots[key] = children[key] as SlotFunction;
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
  return [value as VNode];
}
