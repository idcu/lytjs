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

export type FunctionKeys<T> = ExtractKeysByType<T, Function>;

export type NonFunctionKeys<T> = Exclude<keyof T, FunctionKeys<T>>;

export type Constructor<T = any> = new (...args: any[]) => T;

export type AbstractConstructor<T = any> = abstract new (...args: any[]) => T;

export type ValueOf<T> = T[keyof T];

export type PromiseOrValue<T> = T | Promise<T>;

export type AsyncFunction<T = any, Args extends any[] = any[]> = (...args: Args) => Promise<T>;

export type AnyFunction<T = any> = (...args: any[]) => T;

export type EmptyObject = Record<string, never>;

export type Dictionary<T = any> = Record<string, T>;

export type NumericDictionary<T = any> = Record<number, T>;

export type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type Nullish = null | undefined;

export type NonNullable<T> = T extends null | undefined ? never : T;

export type NonNullish<T> = Exclude<T, null | undefined>;

export type ArrayElement<T> = T extends (infer E)[] ? E : never;

export type Last<T extends any[]> = T extends [...any[], infer L] ? L : never;

export type First<T extends any[]> = T extends [infer F, ...any[]] ? F : never;

export type TupleToUnion<T extends any[]> = T[number];

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
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
  : T extends object & { then(onfulfilled: infer F, ...args: any[]): any }
    ? F extends (value: infer V, ...args: any[]) => any
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
