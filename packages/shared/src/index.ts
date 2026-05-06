/**
 * @lytjs/shared - 共享工具函数库
 *
 * 提供框架内部使用的共享工具函数，所有导出函数都包含详细的 JSDoc 注释
 *
 * @module @lytjs/shared
 * @version 6.0.0
 */

// ============================================================
// 类型判断工具
// ============================================================

/**
 * 检查值是否为字符串类型
 *
 * @param value - 要检查的值
 * @returns 如果是字符串则返回 true，否则返回 false
 * @example
 * ```ts
 * isString('hello') // true
 * isString(123) // false
 * ```
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 检查值是否为数字类型（不包括 NaN）
 *
 * @param value - 要检查的值
 * @returns 如果是有效数字则返回 true，否则返回 false
 * @example
 * ```ts
 * isNumber(42) // true
 * isNumber(NaN) // false
 * isNumber('42') // false
 * ```
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 检查值是否为布尔类型
 *
 * @param value - 要检查的值
 * @returns 如果是布尔值则返回 true，否则返回 false
 * @example
 * ```ts
 * isBoolean(true) // true
 * isBoolean(1) // false
 * ```
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * 检查值是否为函数类型
 *
 * @param value - 要检查的值
 * @returns 如果是函数则返回 true，否则返回 false
 * @example
 * ```ts
 * isFunction(() => {}) // true
 * isFunction({}) // false
 * ```
 */
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

/**
 * 检查值是否为对象类型（不包括 null）
 *
 * @param value - 要检查的值
 * @returns 如果是对象则返回 true，否则返回 false
 * @example
 * ```ts
 * isObject({}) // true
 * isObject(null) // false
 * isObject([]) // true
 * ```
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

/**
 * 检查值是否为普通对象（通过 Object.prototype.toString 判断）
 *
 * @param value - 要检查的值
 * @returns 如果是普通对象则返回 true，否则返回 false
 * @example
 * ```ts
 * isPlainObject({}) // true
 * isPlainObject([]) // false
 * isPlainObject(new Date()) // false
 * ```
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * 检查值是否为数组类型
 *
 * @param value - 要检查的值
 * @returns 如果是数组则返回 true，否则返回 false
 * @example
 * ```ts
 * isArray([]) // true
 * isArray({}) // false
 * ```
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * 检查值是否为 null 或 undefined
 *
 * @param value - 要检查的值
 * @returns 如果是 null 或 undefined 则返回 true，否则返回 false
 * @example
 * ```ts
 * isNullish(null) // true
 * isNullish(undefined) // true
 * isNullish(0) // false
 * isNullish('') // false
 * ```
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * 检查值是否为 Promise 对象
 *
 * @param value - 要检查的值
 * @returns 如果是 Promise 则返回 true，否则返回 false
 * @example
 * ```ts
 * isPromise(Promise.resolve()) // true
 * isPromise({ then: () => {} }) // true (thenable)
 * isPromise(42) // false
 * ```
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return (
    value instanceof Promise ||
    (isObject(value) &&
      isFunction((value as PromiseLike<T>).then) &&
      isFunction((value as PromiseLike<T>).catch))
  );
}

// ============================================================
// 字符串处理工具
// ============================================================

/**
 * 将字符串首字母大写
 *
 * @param str - 输入字符串
 * @returns 首字母大写的字符串
 * @example
 * ```ts
 * capitalize('hello') // 'Hello'
 * capitalize('HELLO') // 'HELLO'
 * ```
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 将 camelCase 转换为 kebab-case
 *
 * @param str - camelCase 字符串
 * @returns kebab-case 字符串
 * @example
 * ```ts
 * camelToKebab('myPropertyName') // 'my-property-name'
 * camelToKebab('URLParser') // 'u-r-l-parser'
 * ```
 */
export function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

/**
 * 将 kebab-case 转换为 camelCase
 *
 * @param str - kebab-case 字符串
 * @returns camelCase 字符串
 * @example
 * ```ts
 * kebabToCamel('my-property-name') // 'myPropertyName'
 * kebabToCamel('data-value') // 'dataValue'
 * ```
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 生成唯一 ID
 *
 * FIX: P2-v11-26 优先使用 crypto.randomUUID 回退，减少对全局可变计数器的依赖，
 * 降低多实例/多窗口场景下的 ID 冲突风险
 *
 * @param prefix - ID 前缀（可选）
 * @returns 唯一 ID 字符串
 * @example
 * ```ts
 * generateId() // 'lyt-abc123'
 * generateId('btn') // 'btn-abc123'
 * ```
 */
let idCounter = 0;
export function generateId(prefix = 'lyt'): string {
  // 优先使用 crypto.randomUUID（如果可用），截取前 8 位作为后缀
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  // 回退：使用全局计数器 + 时间戳
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}

// ============================================================
// 对象操作工具
// ============================================================

/**
 * 检查对象是否拥有指定属性（不检查原型链）
 *
 * @param obj - 要检查的对象
 * @param key - 属性键
 * @returns 如果对象拥有该属性则返回 true，否则返回 false
 * @example
 * ```ts
 * const obj = { a: 1 }
 * hasOwn(obj, 'a') // true
 * hasOwn(obj, 'toString') // false
 * ```
 */
export function hasOwn<T extends Record<string, unknown>>(
  obj: T,
  key: PropertyKey,
): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * 检查两个值是否发生变化（使用 Object.is 比较）
 *
 * @param value - 新值
 * @param oldValue - 旧值
 * @returns 如果发生变化则返回 true，否则返回 false
 * @example
 * ```ts
 * hasChanged(1, 2) // true
 * hasChanged(1, 1) // false
 * hasChanged(NaN, NaN) // false (Object.is 行为)
 * ```
 */
export function hasChanged(value: unknown, oldValue: unknown): boolean {
  return !Object.is(value, oldValue);
}

/**
 * 创建对象的浅拷贝
 *
 * @param obj - 源对象
 * @returns 浅拷贝后的新对象
 * @example
 * ```ts
 * const original = { a: 1, b: { c: 2 } }
 * const copy = shallowClone(original)
 * copy.a = 3 // original.a 仍为 1
 * copy.b.c = 4 // original.b.c 也变为 4
 * ```
 */
export function shallowClone<T extends Record<string, unknown>>(obj: T): T {
  return { ...obj };
}

/**
 * 创建对象的深拷贝（支持基本类型、对象、数组、Date、RegExp、Map、Set）
 *
 * FIX: P2-v11-30 添加对 Map 和 Set 类型的支持，
 * 确保包含 Map/Set 的对象能被正确深拷贝
 *
 * @param obj - 源对象
 * @returns 深拷贝后的新对象
 * @example
 * ```ts
 * const original = { a: 1, b: { c: [1, 2, 3] } }
 * const copy = deepClone(original)
 * copy.b.c.push(4) // original.b.c 不变
 * ```
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;

  // FIX: P2 泛型 T 的限制：TypeScript 无法推导 instanceof 分支返回值与泛型 T 的兼容性。
  // 例如 Date | RegExp | Map | Set 等内置类型的构造函数返回具体类型，
  // 但泛型 T 可能是联合类型。此处 as unknown as T 是安全的，因为进入对应
  // instanceof 分支时，obj 的运行时类型与构造函数返回类型一致。
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof RegExp) return new RegExp(obj) as unknown as T;

  // FIX: P2-v11-30 支持 Map 类型深拷贝
  if (obj instanceof Map) {
    const clonedMap = new Map();
    for (const [key, value] of obj) {
      clonedMap.set(deepClone(key), deepClone(value));
    }
    return clonedMap as unknown as T;
  }

  // FIX: P2-v11-30 支持 Set 类型深拷贝
  if (obj instanceof Set) {
    const clonedSet = new Set();
    for (const value of obj) {
      clonedSet.add(deepClone(value));
    }
    return clonedSet as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }

  const cloned = {} as Record<string, unknown>;
  for (const key in obj) {
    if (hasOwn(obj as Record<string, unknown>, key)) {
      cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
    }
  }
  return cloned as T;
}

/**
 * 合并两个对象，后面的对象属性覆盖前面的
 *
 * @param target - 目标对象
 * @param source - 源对象
 * @returns 合并后的新对象
 * @example
 * ```ts
 * merge({ a: 1, b: 2 }, { b: 3, c: 4 }) // { a: 1, b: 3, c: 4 }
 * ```
 */
export function merge<T extends Record<string, unknown>,
  U extends Record<string, unknown>>(
  target: T,
  source: U,
): T & U {
  return { ...target, ...source };
}

/**
 * 从对象中选取指定属性
 *
 * @param obj - 源对象
 * @param keys - 要选取的属性键数组
 * @returns 包含指定属性的新对象
 * @example
 * ```ts
 * const obj = { a: 1, b: 2, c: 3 }
 * pick(obj, ['a', 'c']) // { a: 1, c: 3 }
 * ```
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * 从对象中排除指定属性
 *
 * @param obj - 源对象
 * @param keys - 要排除的属性键数组
 * @returns 不包含指定属性的新对象
 * @example
 * ```ts
 * const obj = { a: 1, b: 2, c: 3 }
 * omit(obj, ['b']) // { a: 1, c: 3 }
 * ```
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => {
    delete (result as Record<string, unknown>)[key as string];
  });
  return result;
}

// ============================================================
// 数组处理工具
// ============================================================

/**
 * 移除数组中的重复项（使用 Set）
 *
 * @param arr - 输入数组
 * @returns 去重后的新数组
 * @example
 * ```ts
 * unique([1, 2, 2, 3, 3, 3]) // [1, 2, 3]
 * ```
 */
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * 将数组按指定大小分块
 *
 * @param arr - 输入数组
 * @param size - 每块大小
 * @returns 分块后的二维数组
 * @example
 * ```ts
 * chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 * ```
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * 扁平化数组（一层）
 *
 * @param arr - 嵌套数组
 * @returns 扁平化后的数组
 * @example
 * ```ts
 * flatten([[1, 2], [3, 4], [5]]) // [1, 2, 3, 4, 5]
 * ```
 */
export function flatten<T>(arr: T[][]): T[] {
  return arr.reduce((acc, val) => acc.concat(val), []);
}

/**
 * 按指定键对数组进行分组
 *
 * @param arr - 对象数组
 * @param key - 分组键
 * @returns 分组后的对象
 * @example
 * ```ts
 * const users = [
 *   { role: 'admin', name: 'Alice' },
 *   { role: 'user', name: 'Bob' },
 *   { role: 'admin', name: 'Charlie' }
 * ]
 * groupBy(users, 'role')
 * // { admin: [{...}, {...}], user: [{...}] }
 * ```
 */
export function groupBy<T extends Record<string, unknown>>(
  arr: T[],
  key: keyof T,
): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const groupKey = String(item[key]);
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// ============================================================
// 函数工具
// ============================================================

/**
 * 空操作函数（no-op）
 */
export const NOOP = (): void => {};

/**
 * 返回自身的恒等函数
 *
 * @param value - 输入值
 * @returns 输入值本身
 * @example
 * ```ts
 * identity(42) // 42
 * identity({ a: 1 }) // { a: 1 }
 * ```
 */
export function identity<T>(value: T): T {
  return value;
}

/**
 * 创建一个始终返回指定值的函数
 *
 * @param value - 要返回的值
 * @returns 返回该值的函数
 * @example
 * ```ts
 * const alwaysTrue = constant(true)
 * alwaysTrue() // true
 * ```
 */
export function constant<T>(value: T): () => T {
  return () => value;
}

/**
 * 延迟执行函数（setTimeout 的 Promise 包装）
 *
 * @param ms - 延迟毫秒数
 * @returns Promise
 * @example
 * ```ts
 * await delay(1000) // 等待 1 秒
 * ```
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 函数防抖
 *
 * FIX: P2-v11-29 debounce 返回取消函数，允许调用方在需要时取消防抖定时器，
 * 避免组件卸载后定时器仍在运行导致内存泄漏
 *
 * @param fn - 要防抖的函数
 * @param wait - 等待毫秒数
 * @returns 防抖后的函数（附带 cancel 方法）
 * @example
 * ```ts
 * const debounced = debounce(() => console.log('called'), 300)
 * debounced() // 300ms 后输出 'called'
 * debounced() // 重新计时
 * debounced.cancel() // 取消防抖
 * ```
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number,
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<T>): void => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), wait);
  };
  // FIX: P2-v11-29 添加 cancel 方法，允许取消防抖定时器
  debounced.cancel = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  return debounced;
}

/**
 * 函数节流
 *
 * FIX: P2-v11-28 throttle 返回取消函数，允许调用方在需要时取消节流定时器，
 * 避免组件卸载后定时器仍在运行导致内存泄漏
 *
 * @param fn - 要节流的函数
 * @param limit - 限制毫秒数
 * @returns 节流后的函数（附带 cancel 方法）
 * @example
 * ```ts
 * const throttled = throttle(() => console.log('called'), 300)
 * throttled() // 立即执行
 * throttled() // 300ms 内被忽略
 * throttled.cancel() // 取消节流
 * ```
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number,
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let inThrottle = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  const throttled = (...args: Parameters<T>): void => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      timerId = setTimeout(() => {
        inThrottle = false;
        timerId = null;
      }, limit);
    }
  };
  // FIX: P2-v11-28 添加 cancel 方法，允许取消节流定时器
  throttled.cancel = (): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    inThrottle = false;
  };
  return throttled;
}

/**
 * 只执行一次的函数
 *
 * FIX: P2-v11-27 改进 once 函数：支持异步函数场景，
 * 在异步执行期间阻止重复调用，执行完成后正确返回结果
 *
 * @param fn - 要执行的函数
 * @returns 只执行一次的包装函数
 * @example
 * ```ts
 * const init = once(() => console.log('initialized'))
 * init() // 输出 'initialized'
 * init() // 无输出
 * ```
 */
export function once<T extends (...args: unknown[]) => unknown>(
  fn: T,
): (...args: Parameters<T>) => ReturnType<T> | undefined | Promise<ReturnType<T> | undefined> {
  let called = false;
  let result: ReturnType<T>;
  let pendingPromise: Promise<ReturnType<T>> | null = null;

  return (...args: Parameters<T>): ReturnType<T> | undefined | Promise<ReturnType<T> | undefined> => {
    if (!called) {
      called = true;
      try {
        result = fn(...args) as ReturnType<T>;
        // 如果结果是 Promise，跟踪其状态以防止并发调用
        if (result instanceof Promise) {
          pendingPromise = result;
          return result.then(
            (val) => { pendingPromise = null; return val; },
            (err) => { pendingPromise = null; throw err; },
          ) as Promise<ReturnType<T> | undefined>;
        }
        return result;
      } catch (e) {
        // 同步异常：重置 called 标志，允许重试
        called = false;
        throw e;
      }
    }
    // 如果有正在执行的异步操作，返回其 Promise
    if (pendingPromise) return pendingPromise;
    return undefined;
  };
}

// ============================================================
// 缓存工具
// ============================================================

/**
 * 简单的记忆化函数（memoize）
 *
 * @param fn - 要缓存的函数
 * @param maxSize - 缓存最大条目数，默认 128。超过时清除最早条目
 * @returns 带缓存的函数
 * @example
 * ```ts
 * const fib = memoize((n: number): number => {
 *   if (n < 2) return n
 *   return fib(n - 1) + fib(n - 2)
 * })
 * fib(40) // 快速计算
 * ```
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  maxSize: number = 128,
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, ReturnType<T>>();
  // FIX: P2-batch2-15 使用索引追踪替代 Array.shift()，将 LRU 淘汰从 O(n) 降为 O(1)
  const keyOrder: string[] = [];
  let evictionIndex = 0;

  /** 对参数进行稳定排序，确保对象键序不同时产生相同的 key */
  function stableStringify(args: unknown[]): string {
    return JSON.stringify(args, (_key, value) => {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // 对对象键进行排序，确保稳定序列化
        const sorted: Record<string, unknown> = {};
        Object.keys(value)
          .sort()
          .forEach((k) => {
            sorted[k] = (value as Record<string, unknown>)[k];
          });
        return sorted;
      }
      return value;
    });
  }

  return (...args: Parameters<T>): ReturnType<T> => {
    let key: string;
    try {
      key = stableStringify(args);
    } catch {
      // 循环引用或其他序列化错误时，直接调用原函数不缓存
      return fn(...args) as ReturnType<T>;
    }

    if (cache.has(key)) return cache.get(key)!;

    const result = fn(...args) as ReturnType<T>;
    cache.set(key, result);
    keyOrder.push(key);

    // 超过 maxSize 时，清除最早条目（使用索引追踪，O(1) 淘汰）
    if (keyOrder.length > maxSize) {
      const oldestKey = keyOrder[evictionIndex];
      cache.delete(oldestKey);
      evictionIndex++;
      // 当所有旧条目都被淘汰后，压缩数组释放内存
      if (evictionIndex > maxSize) {
        keyOrder.splice(0, evictionIndex);
        evictionIndex = 0;
      }
    }

    return result;
  };
}

// ============================================================
// 错误处理工具
// ============================================================

/**
 * 安全地执行函数，捕获错误并返回结果或默认值
 *
 * @param fn - 要执行的函数
 * @param defaultValue - 出错时的默认值
 * @returns 函数结果或默认值
 * @example
 * ```ts
 * safeExec(() => JSON.parse('invalid'), null) // null
 * safeExec(() => JSON.parse('{}'), null) // {}
 * ```
 */
export function safeExec<T>(fn: () => T, defaultValue: T): T {
  try {
    return fn();
  } catch {
    return defaultValue;
  }
}

/**
 * 安全地解析 JSON
 *
 * @param str - JSON 字符串
 * @param defaultValue - 解析失败时的默认值
 * @returns 解析结果或默认值
 * @example
 * ```ts
 * safeJsonParse('{"a":1}', {}) // { a: 1 }
 * safeJsonParse('invalid', {}) // {}
 * ```
 */
export function safeJsonParse<T>(str: string, defaultValue: T): T {
  return safeExec(() => JSON.parse(str) as T, defaultValue);
}

// ============================================================
// 常量
// ============================================================

/**
 * 空对象常量（冻结）
 */
export const EMPTY_OBJ: Record<string, never> = Object.freeze({});

/**
 * 空数组常量（冻结）
 */
export const EMPTY_ARR: unknown[] = Object.freeze([]) as unknown[];

/**
 * 空函数常量
 */
export const EMPTY_FN = (): void => {};
