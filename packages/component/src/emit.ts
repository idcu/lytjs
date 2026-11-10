// src/emit.ts
// 事件发射系统

import { isFunction, hasOwn, isArray } from '@lytjs/common-is';
import { kebabToCamel, camelToKebab } from '@lytjs/common-string';
import { warn } from '@lytjs/common-error';
import type { ComponentInternalInstance } from './types';
import { handleError } from './lifecycle';

/**
 * Normalize emits definition into a consistent Record<string, any> format.
 */
export function normalizeEmitsOptions(
  emits?: string[] | Record<string, (...args: unknown[]) => unknown>,
): Record<string, unknown> | null {
  if (!emits) return null;

  if (isArray(emits)) {
    // 数组形式：['click', 'change'] => { click: null, change: null }
    const result: Record<string, unknown> = {};
    for (let i = 0; i < emits.length; i++) {
      const key = emits[i]!;
      result[key] = null;
    }
    return result;
  }

  // 已经是对象形式（Record<string, Function | null>）
  return emits as Record<string, unknown>;
}

/**
 * 将事件名统一转换为 camelCase 形式，用于 emits 选项的声明式查找。
 * 例如: 'update:model-value' => 'update:modelValue'
 */
function normalizeEventName(event: string): string {
  return kebabToCamel(event);
}

/**
 * 将事件名转换为处理器 key
 * 先将 kebab-case 转为 camelCase，再首字母大写加 on 前缀
 * 例如: 'update:model-value' => 'onUpdate:modelValue'
 */
function toHandlerKey(event: string): string {
  if (!event) return '';
  const camelized = normalizeEventName(event);
  return `on${camelized[0]!.toUpperCase()}${camelized.slice(1)}`;
}

/**
 * Emit an event on a component instance.
 * Looks for `onXxx` handler in props and attrs (camelCase conversion).
 */
export function emit(instance: ComponentInternalInstance, event: string, ...args: unknown[]): void {
  if (instance.isUnmounted) return;

  if (__DEV__ && !isEmitValid(instance, event)) {
    warn(`Component emitted event "${event}" but it is not declared in emits.`);
  }

  // 规范化事件名：将 kebab-case 转为 camelCase 用于处理器查找
  const handlerName = toHandlerKey(event);

  // 先在 props 中查找处理器，再在 attrs 中查找
  let handler = instance.props[handlerName] ?? instance.attrs[handlerName];
  if (!isFunction(handler) && event) {
    // ★ 2026-11-10（N28）：kebab 事件名回退。
    //   `@lytjs/compiler` **不** camelize 模板属性名 ⇒ 模板里写 `@sort-change`
    //   生成的键是 `onSort-change`，而上面的 `toHandlerKey` 查的是 `onSortChange`
    //   ⇒ 连字符事件**永远送不到处理器**，且不报错、不警告。
    //   这里再按「on + 首字母大写的 kebab 事件名」查一次（`sortChange` →
    //   `onSort-change`），两种写法都能收到。
    //   ⚠️ 上一版误写成「on + 原始事件名」，对 camelCase 事件算出来与
    //   `handlerName` 相同 ⇒ 等于没加回退（实测 called=0 就是这个原因）。
    const kebab = camelToKebab(event);
    const rawKey = `on${kebab[0]!.toUpperCase()}${kebab.slice(1)}`;
    handler = instance.props[rawKey] ?? instance.attrs[rawKey];
  }
  if (isFunction(handler)) {
    try {
      handler(...args);
    } catch (err) {
      handleError(err as Error, instance, `event handler for "${event}"`);
    }
  }
}

/**
 * 检查事件是否在 emits 选项中声明。
 * 使用与 emit() 相同的规范化（kebab-case -> camelCase）以确保
 * 一致的事件名匹配。
 */
export function isEmitValid(instance: ComponentInternalInstance, event: string): boolean {
  if (!instance.emitsOptions) return true;
  const normalized = normalizeEventName(event);
  return hasOwn(instance.emitsOptions, normalized) || hasOwn(instance.emitsOptions, event);
}
