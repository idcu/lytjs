/**
 * @lytjs/shared-types - 通用类型工具
 * 提供常用的类型工具函数和类型别名
 */

// 类型工具别名 - 与原生 TypeScript 保持一致
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type PartialExcept<T, K extends keyof T> = Partial<Pick<T, Exclude<keyof T, K>>> &
  Pick<T, K>;

export type RequiredExcept<T, K extends keyof T> = Required<Pick<T, Exclude<keyof T, K>>> &
  Partial<Pick<T, K>>;

export type Mutable<T> = { -readonly [P in keyof T]: T[P] };

export type DeepMutable<T> = {
  -readonly [P in keyof T]: T[P] extends object ? DeepMutable<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type ExtractKeysByType<T, ValueType> = {
  [Key in keyof T]-?: T[Key] extends ValueType ? Key : never;
}[keyof T];

export type OmitByType<T, ValueType> = Omit<T, ExtractKeysByType<T, ValueType>>;

export type PickByType<T, ValueType> = Pick<T, ExtractKeysByType<T, ValueType>>;

export type Maybe<T> = T | null | undefined;

export type MaybeArray<T> = T | T[];

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type Without<T, K extends keyof T> = Omit<T, K>;

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type FunctionKeys<T> = ExtractKeysByType<T, Function>;

export type NonFunctionKeys<T> = Exclude<keyof T, FunctionKeys<T>>;

export type Constructor<T = unknown> = new (...args: unknown[]) => T;

export type AbstractConstructor<T = unknown> = abstract new (...args: unknown[]) => T;

export type PromiseOrValue<T> = T | Promise<T>;

export type AsyncFunction<T = unknown, Args extends unknown[] = unknown[]> = (
  ...args: Args
) => Promise<T>;

export type AnyFunction<T = unknown> = (...args: unknown[]) => T;

export type EmptyObject = Record<string, never>;

export type Dictionary<T = unknown> = Record<string, T>;

export type NumericDictionary<T = unknown> = Record<number, T>;

export type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type Nullish = null | undefined;

export type NonNullable<T> = T extends null | undefined ? never : T;

export type NonNullish<T> = Exclude<T, null | undefined>;

export type ArrayElement<T> = T extends (infer E)[] ? E : never;

export type Last<T extends unknown[]> = T extends [...unknown[], infer L] ? L : never;

export type First<T extends unknown[]> = T extends [infer F, ...unknown[]] ? F : never;

export type TupleToUnion<T extends unknown[]> = T[number];

export type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

export type IsAny<T> = 0 extends 1 & T ? true : false;

export type IsNever<T> = [T] extends [never] ? true : false;

export type IsUnknown<T> = IsNever<T> extends true ? false : unknown extends T ? true : false;

export type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N;

export type IfNever<T, Y, N> = [T] extends [never] ? Y : N;

export type IfUnknown<T, Y, N> = IsUnknown<T> extends true ? Y : N;

export type Awaited<T> = T extends null | undefined
  ? T
  : T extends object & { then(onfulfilled: infer F, ...args: unknown[]): unknown }
    ? F extends (value: infer V, ...args: unknown[]) => unknown
      ? Awaited<V>
      : never
    : T;

export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

export type Expect<T extends true> = T;

export type Not<T extends boolean> = T extends true ? false : true;

export type And<T extends boolean, U extends boolean> = [T, U] extends [true, true] ? true : false;

export type Or<T extends boolean, U extends boolean> = T extends true
  ? true
  : U extends true
    ? true
    : false;

export type Extends<T, U> = T extends U ? true : false;

export type Override<T, U> = Omit<T, keyof U> & U;

export type Merge<T, U> = {
  [K in keyof T | keyof U]: K extends keyof U ? U[K] : K extends keyof T ? T[K] : never;
};

export type StrictMerge<T, U> = Omit<T, keyof U> & U;

export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

export type DeepRequired<T> = T extends object ? { [K in keyof T]-?: DeepRequired<T[K]> } : T;

export type DeepPick<T, Paths extends string> = Paths extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? { [K in Key]: DeepPick<T[K], Rest> }
    : never
  : Paths extends keyof T
    ? { [K in Paths]: T[K] }
    : never;

export type MarkNonNullable<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };

export type MarkNullable<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] | null };

export type MarkOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type MarkRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export type StringKeyOf<T> = Extract<keyof T, string>;

export type NumberKeyOf<T> = Extract<keyof T, number>;

export type SymbolKeyOf<T> = Extract<keyof T, symbol>;

export type WritableKeys<T> = keyof {
  [P in keyof T as { [Q in P]: T[P] } extends { -readonly [Q in P]: T[P] } ? P : never]: unknown;
};

export type ReadonlyKeys<T> = keyof {
  [P in keyof T as { [Q in P]: T[P] } extends { -readonly [Q in P]: T[P] } ? never : P]: unknown;
};

export type RequiredKeys<T> = { [P in keyof T]-?: {} extends Pick<T, P> ? never : P }[keyof T];

export type OptionalKeys<T> = { [P in keyof T]-?: {} extends Pick<T, P> ? P : never }[keyof T];

export type PickRequired<T> = Pick<T, RequiredKeys<T>>;

export type PickOptional<T> = Pick<T, OptionalKeys<T>>;

export type OmitRequired<T> = Omit<T, RequiredKeys<T>>;

export type OmitOptional<T> = Omit<T, OptionalKeys<T>>;

// ============================================
// v6.8.0 新增：更好的泛型推断类型工具
// ============================================

/**
 * 推断函数参数类型
 * @template F - 函数类型
 */
export type Parameters<T extends (...args: unknown[]) => unknown> = T extends (
  ...args: infer P
) => unknown
  ? P
  : never;

/**
 * 推断函数返回值类型
 * @template F - 函数类型
 */
export type ReturnType<T extends (...args: unknown[]) => unknown> = T extends (
  ...args: unknown[]
) => infer R
  ? R
  : never;

/**
 * 推断构造函数参数类型
 * @template C - 构造函数类型
 */
export type ConstructorParameters<T extends abstract new (...args: unknown[]) => unknown> =
  T extends abstract new (...args: infer P) => unknown ? P : never;

/**
 * 推断构造函数实例类型
 * @template C - 构造函数类型
 */
export type InstanceType<T extends abstract new (...args: unknown[]) => unknown> =
  T extends abstract new (...args: unknown[]) => infer R ? R : never;

/**
 * 提取 Promise 的值类型
 * @template T - Promise 类型
 */
export type UnwrapPromise<T> = T extends Promise<infer U> ? UnwrapPromise<U> : T;

/**
 * 深度扁平化类型
 * @template T - 要扁平化的类型
 */
export type DeepFlatten<T> = T extends Array<infer U> ? DeepFlatten<U> : T;

/**
 * 提取对象的非可选属性
 * @template T - 对象类型
 */
export type NonOptionalProperties<T> = {
  [K in keyof T as T[K] extends Required<T>[K] ? K : never]: T[K];
};

/**
 * 合并两个对象，保留第二个对象的类型
 * @template T - 第一个对象
 * @template U - 第二个对象
 */
export type Combine<T, U> = T & U extends infer O ? { [K in keyof O]: O[K] } : never;

/**
 * 严格的类型合并，要求两个对象没有重叠的键
 * @template T - 第一个对象
 * @template U - 第二个对象
 */
export type StrictCombine<T, U> = keyof T & keyof U extends never ? T & U : never;

// ============================================
// v6.8.0 新增：类型守卫增强
// ============================================

/**
 * 类型守卫函数类型
 * @template T - 要守卫的类型
 */
export type TypeGuard<T> = (value: unknown) => value is T;

/**
 * 联合类型的类型守卫
 * @template T - 联合类型
 * @template K - 要提取的类型
 */
export type UnionTypeGuard<T, K extends T> = (value: T) => value is K;

/**
 * 类型守卫工厂函数类型
 * @template T - 要守卫的类型
 */
export type TypeGuardFactory<T> = () => TypeGuard<T>;

/**
 * 可空类型的类型守卫
 * @template T - 基础类型
 */
export type NullableTypeGuard<T> = (value: T | null | undefined) => value is T;

/**
 * 数组类型的类型守卫
 * @template T - 数组元素类型
 */
export type ArrayTypeGuard<T> = (value: unknown) => value is T[];

// ============================================
// v6.8.0 新增：模板字符串类型支持
// ============================================

// 注：Uppercase, Lowercase, Capitalize, Uncapitalize 是 TypeScript 内置类型，无需重复定义

/**
 * 连接字符串类型
 * @template A - 第一个字符串
 * @template B - 第二个字符串
 * @template Separator - 分隔符
 */
export type Join<
  A extends string,
  B extends string,
  Separator extends string = '',
> = `${A}${Separator}${B}`;

/**
 * 拆分字符串类型
 * @template S - 要拆分的字符串
 * @template Delimiter - 分隔符
 */
export type Split<
  S extends string,
  Delimiter extends string,
> = S extends `${infer Head}${Delimiter}${infer Tail}` ? [Head, ...Split<Tail, Delimiter>] : [S];

/**
 * 驼峰命名转下划线命名
 * @template S - 字符串类型
 */
export type CamelToSnake<S extends string> = S extends `${infer C}${infer Rest}`
  ? C extends Capitalize<C>
    ? `_${Lowercase<C>}${CamelToSnake<Rest>}`
    : `${C}${CamelToSnake<Rest>}`
  : S;

/**
 * 下划线命名转驼峰命名
 * @template S - 字符串类型
 */
export type SnakeToCamel<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Head}${Capitalize<SnakeToCamel<Tail>>}`
  : S;

/**
 * 驼峰命名转短横线命名
 * @template S - 字符串类型
 */
export type CamelToKebab<S extends string> = S extends `${infer C}${infer Rest}`
  ? C extends Capitalize<C>
    ? `-${Lowercase<C>}${CamelToKebab<Rest>}`
    : `${C}${CamelToKebab<Rest>}`
  : S;

/**
 * 短横线命名转驼峰命名
 * @template S - 字符串类型
 */
export type KebabToCamel<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<KebabToCamel<Tail>>}`
  : S;

// ============================================
// v6.8.0 新增：类型安全的事件系统类型
// ============================================

/**
 * 事件处理器类型
 * @template Args - 事件参数类型
 */
export type EventHandler<Args extends unknown[] = unknown[]> = (
  ...args: Args
) => void | Promise<void>;

/**
 * 事件监听器映射类型
 * @template Events - 事件类型映射
 */
export type EventListeners<Events extends Record<string, unknown[]>> = {
  [K in keyof Events]?: Set<EventHandler<Events[K]>>;
};

/**
 * 事件发射器接口
 * @template Events - 事件类型映射
 */
export interface IEventEmitter<Events extends Record<string, unknown[]>> {
  /**
   * 添加事件监听器
   * @param event - 事件名称
   * @param handler - 事件处理器
   */
  on<E extends keyof Events>(event: E, handler: EventHandler<Events[E]>): void;

  /**
   * 移除事件监听器
   * @param event - 事件名称
   * @param handler - 事件处理器
   */
  off<E extends keyof Events>(event: E, handler: EventHandler<Events[E]>): void;

  /**
   * 触发事件
   * @param event - 事件名称
   * @param args - 事件参数
   */
  emit<E extends keyof Events>(event: E, ...args: Events[E]): void;

  /**
   * 一次性事件监听器
   * @param event - 事件名称
   * @param handler - 事件处理器
   */
  once<E extends keyof Events>(event: E, handler: EventHandler<Events[E]>): void;

  /**
   * 移除所有事件监听器
   * @param event - 事件名称（可选，不传则移除所有）
   */
  removeAllListeners<E extends keyof Events>(event?: E): void;
}

/**
 * 事件类型定义工具
 * @template BaseEvents - 基础事件类型
 */
export type DefineEvents<BaseEvents extends Record<string, unknown[]>> = BaseEvents;

/**
 * 扩展事件类型
 * @template BaseEvents - 基础事件类型
 * @template NewEvents - 新事件类型
 */
export type ExtendEvents<
  BaseEvents extends Record<string, unknown[]>,
  NewEvents extends Record<string, unknown[]>,
> = Combine<BaseEvents, NewEvents>;

// ============================================
// v6.8.0 新增：更强大的类型推断工具
// ============================================

/**
 * 推断对象的键类型
 * @template T - 对象类型
 */
export type KeyOf<T> = keyof T;

/**
 * 推断对象的值类型
 * @template T - 对象类型
 */
export type ValueOf<T> = T[keyof T];

/**
 * 推断数组的元素类型
 * @template T - 数组类型
 */
export type ElementOf<T> = T extends (infer E)[] ? E : never;

/**
 * 推断 Promise 的结果类型
 * @template T - Promise 类型
 */
export type PromiseResult<T> = T extends Promise<infer R> ? R : T;

/**
 * 推断函数的 this 类型
 * @template F - 函数类型
 */
export type ThisParameterType<T> = T extends (this: infer U, ...args: unknown[]) => unknown
  ? U
  : unknown;

/**
 * 移除函数的 this 参数
 * @template F - 函数类型
 */
export type OmitThisParameter<T> =
  unknown extends ThisParameterType<T>
    ? T
    : T extends (...args: infer A) => infer R
      ? (...args: A) => R
      : T;

// ============================================
// v6.8.0 新增：类型守卫运行时工具
// ============================================

/**
 * 运行时类型守卫 - 检查是否为字符串
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 运行时类型守卫 - 检查是否为数字
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

/**
 * 运行时类型守卫 - 检查是否为布尔值
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * 运行时类型守卫 - 检查是否为对象
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 运行时类型守卫 - 检查是否为数组
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * 运行时类型守卫 - 检查是否为函数
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

/**
 * 运行时类型守卫 - 检查是否为 null
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * 运行时类型守卫 - 检查是否为 undefined
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * 运行时类型守卫 - 检查是否为 null 或 undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * 运行时类型守卫 - 检查是否有指定属性
 */
export function hasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  key: K,
): obj is T & Record<K, unknown> {
  return key in obj;
}

/**
 * 数组类型守卫工厂
 */
export function createArrayTypeGuard<T>(
  elementGuard: (value: unknown) => value is T,
): ArrayTypeGuard<T> {
  return (value: unknown): value is T[] => {
    return isArray(value) && value.every(elementGuard);
  };
}

/**
 * 对象类型守卫工厂
 */
export function createObjectTypeGuard<T extends Record<string, unknown>>(
  shape: Record<string, (value: unknown) => boolean>,
): TypeGuard<T> {
  return (value: unknown): value is T => {
    if (!isObject(value)) return false;
    return Object.entries(shape).every(([key, guard]) => guard(value[key]));
  };
}
