// src/emit.ts
// Event emission system

import { isFunction, hasOwn, isArray } from "@lytjs/common-is";
import type { ComponentInternalInstance } from "./types";

/**
 * Normalize emits definition into a consistent Record<string, any> format.
 */
export function normalizeEmitsOptions(
  emits?: string[] | Record<string, (...args: any[]) => any>,
): Record<string, any> | null {
  if (!emits) return null;

  if (isArray(emits)) {
    // Array-based: ['click', 'change'] => { click: null, change: null }
    const result: Record<string, any> = {};
    for (let i = 0; i < emits.length; i++) {
      const key = emits[i]!;
      result[key] = null;
    }
    return result;
  }

  // Already an object (Record<string, Function | null>)
  return emits as Record<string, any>;
}

/**
 * 将 kebab-case 转换为 camelCase
 * 例如: 'update:model-value' => 'update:modelValue'
 */
function camelize(str: string): string {
  return str.replace(/-(\w)/g, (_, c) => (c ? c.toUpperCase() : ""));
}

/**
 * 将事件名转换为处理器 key
 * 先将 kebab-case 转为 camelCase，再首字母大写加 on 前缀
 * 例如: 'update:model-value' => 'onUpdate:modelValue'
 */
function toHandlerKey(event: string): string {
  const camelized = camelize(event);
  return `on${camelized[0]!.toUpperCase()}${camelized.slice(1)}`;
}

/**
 * Emit an event on a component instance.
 * Looks for `onXxx` handler in props and attrs (camelCase conversion).
 */
export function emit(
  instance: ComponentInternalInstance,
  event: string,
  ...args: any[]
): void {
  if (instance.isUnmounted) return;

  // Normalize event name: convert kebab-case to camelCase for handler lookup
  const handlerName = toHandlerKey(event);

  // Look for handler in props first, then attrs
  const handler = instance.props[handlerName] ?? instance.attrs[handlerName];
  if (isFunction(handler)) {
    handler(...args);
  }
}

/**
 * Check if an event is declared in the emits options.
 */
export function isEmitValid(
  instance: ComponentInternalInstance,
  event: string,
): boolean {
  if (!instance.emitsOptions) return true;
  return hasOwn(instance.emitsOptions, event);
}
