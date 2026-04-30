// src/constants.ts
// 内部符号常量

const DEV =
  typeof globalThis !== "undefined" && (globalThis as any).__DEV__ === true;

export const RefSymbol: unique symbol = Symbol(DEV ? "ref" : undefined);
export const ShallowRefSymbol: unique symbol = Symbol(
  DEV ? "shallow_ref" : undefined,
);
export const ComputedRefSymbol: unique symbol = Symbol(
  DEV ? "computed_ref" : undefined,
);
export const ReactiveSymbol: unique symbol = Symbol(
  DEV ? "reactive" : undefined,
);
export const ReadonlySymbol: unique symbol = Symbol(
  DEV ? "readonly" : undefined,
);
export const SignalSymbol: unique symbol = Symbol(DEV ? "signal" : undefined);
export const ComputedSignalSymbol: unique symbol = Symbol(
  DEV ? "computed_signal" : undefined,
);

// ReactiveFlags - 用于 Proxy handler 内部标记
export const ReactiveFlags = {
  IS_REACTIVE: "__v_isReactive",
  IS_READONLY: "__v_isReadonly",
  IS_SHALLOW: "__v_isShallow",
  IS_REF: "__v_isRef",
  RAW: "__v_raw",
  SKIP: "__v_skip",
} as const;

// Track/Trigger 操作类型
export const TrackOpTypes = {
  GET: "get",
  HAS: "has",
  ITERATE: "iterate",
} as const;

export const TriggerOpTypes = {
  SET: "set",
  ADD: "add",
  DELETE: "delete",
  CLEAR: "clear",
} as const;

// 内部共享常量
export const ITERATE_KEY = Symbol("iterate");
