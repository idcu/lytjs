// src/component-inject.ts
// Provide/inject dependency injection system

import { hasOwn } from '@lytjs/common-is';
import { getCurrentInstance } from './lifecycle';

// FIX: P1-9 COMPONENT-NEW-03 - provide/inject 类型推断增强
// InjectionKey 是一个 Symbol 类型，用于在 provide/inject 之间建立类型安全的关联。
// 使用方式：
//   const key = Symbol() as InjectionKey<string>;
//   provide(key, 'hello');
//   const value = inject(key); // 类型为 string | undefined
//
// 改进点：
// 1. 使用泛型约束确保类型推断准确性
// 2. 支持默认值类型推断
// 3. 支持工厂函数类型推断
export interface InjectionKey<T> extends Symbol {
  __injectKey?: T;
}

/**
 * Provide 选项接口
 * 用于类型安全的 provide 调用
 */
export interface ProvideOptions<T = unknown> {
  key: InjectionKey<T> | string | symbol;
  value: T;
}

/**
 * Inject 选项接口（改进版）
 * 支持更精确的类型推断
 */
export interface InjectOptions<T = unknown> {
  /** If true, treat defaultValue as a factory function that will be called to produce the default value */
  factory?: boolean;
  /** Look up the value from a specific ancestor key instead of the injected key */
  from?: InjectionKey<T> | string | symbol;
  /** If true, only look up the value from the current instance's own provides (no ancestor lookup) */
  local?: boolean;
}

// ==================== provide / inject ====================

/**
 * Provide a value to descendant components.
 * FIX: P1-9 COMPONENT-NEW-03 - 改进类型定义，支持 InjectionKey 类型推断
 */
export function provide<T>(key: InjectionKey<T> | string | symbol, value: T): void {
  const instance = getCurrentInstance();
  if (instance) {
    // FIX: P2-34 添加原型链边界说明注释：
    // 首次 provide 时，如果当前 provides 与父级共享同一个引用，
    // 则创建以父级 provides 为原型的新对象，确保层级隔离。
    // 这是利用 JavaScript 原型链实现 provide/inject 的核心机制：
    // 子组件通过原型链向上查找 provides，而当前组件的 provide 会
    // 创建一个新对象遮蔽父级同名 key，不会污染父级的 provides。
    // 注意：Object.create(null) 创建的对象没有原型，因此不会继承
    // Object.prototype 上的属性（如 toString、hasOwnProperty 等），
    // 这是正确的做法，避免 key 冲突。
    if (instance.provides === (instance.parent?.provides ?? null)) {
      instance.provides = Object.create(
        instance.provides as Record<string | symbol, unknown>,
      ) as Record<string | symbol, unknown>;
    }
    // FIX: P0-4 修复 provide/inject symbol key 被转为 string 的问题，直接使用 key 而不进行类型断言
    instance.provides[key as string | symbol] = value;
  }
}

/**
 * Inject a value from ancestor components.
 * FIX: P1-9 COMPONENT-NEW-03 - 改进类型定义，支持更精确的类型推断
 *
 * Supported forms:
 * - `inject('key')` - basic lookup
 * - `inject('key', defaultValue)` - with default value
 * - `inject('key', () => createDefault(), { factory: true })` - factory function default
 * - `inject('key', undefined, { from: 'optionalSourceKey' })` - from modifier
 * - `inject('key', undefined, { local: true })` - local only (no ancestor lookup)
 * - `inject(injectionKey)` - with InjectionKey for type-safe lookup
 */
export function inject<T>(
  key: InjectionKey<T> | string | symbol,
  defaultValue?: T | (() => T),
  options?: InjectOptions<T>,
): T | undefined {
  const instance = getCurrentInstance();
  if (!instance) {
    // No instance context - return default
    return resolveDefault(defaultValue, options);
  }

  const lookupKey = options?.from ?? key;

  if (options?.local) {
    // local mode: only check current instance's own provides (not inherited from parent prototype)
    // If instance.provides is the same reference as parent.provides, the instance
    // has not called provide() yet, so there are no own provides to check.
    const provides = instance.provides as Record<string | symbol, unknown>;
    const hasOwnProvides = instance.parent
      ? provides !== instance.parent.provides
      : true;
    if (hasOwnProvides && hasOwn(provides, lookupKey as string)) {
      return provides[lookupKey as string] as T | undefined;
    }
    return resolveDefault(defaultValue, options);
  }

  // Walk up the parent chain
  let current = instance.parent;
  while (current) {
    const provides = current.provides as Record<string | symbol, unknown>;
    if (lookupKey in provides) {
      return provides[lookupKey as string] as T | undefined;
    }
    current = current.parent;
  }

  return resolveDefault(defaultValue, options);
}

/**
 * Resolve the default value for inject, handling factory functions.
 */
function resolveDefault<T>(defaultValue: T | undefined, options?: InjectOptions): T | undefined {
  if (defaultValue === undefined) return undefined;
  if (options?.factory && typeof defaultValue === 'function') {
    return (defaultValue as unknown as () => T)();
  }
  return defaultValue;
}
