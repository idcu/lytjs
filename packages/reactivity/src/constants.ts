// src/constants.ts
// 内部符号常量

// DEV 检测方式说明：
// 此处使用运行时检测 globalThis.__DEV__，适用于需要在运行时根据 DEV 标志
// 改变行为的场景（如条件性警告、调试符号描述）。
// 与 env.d.ts 中通过 TypeScript declare const __DEV__ 的方式不同：
// - env.d.ts 方式：编译时类型声明，配合打包工具的 define/replace 插件在构建时
//   替换 __DEV__ 为字面量 true/false，实现死代码消除（DCE）。
// - 此处方式：运行时检测，用于无法通过编译时替换覆盖的场景（如独立模块、
//   跨包共享的常量文件）。
// 两种方式在构建产物中最终等价，但此处的运行时检测在未配置构建替换时也能工作。
const DEV =
  typeof globalThis !== 'undefined' && (globalThis as Record<string, unknown>).__DEV__ === true;

export const RefSymbol: unique symbol = Symbol(DEV ? 'ref' : undefined);
export const ShallowRefSymbol: unique symbol = Symbol(DEV ? 'shallow_ref' : undefined);
export const ComputedRefSymbol: unique symbol = Symbol(DEV ? 'computed_ref' : undefined);
export const ReactiveSymbol: unique symbol = Symbol(DEV ? 'reactive' : undefined);
export const ReadonlySymbol: unique symbol = Symbol(DEV ? 'readonly' : undefined);
export const SignalSymbol: unique symbol = Symbol(DEV ? 'signal' : undefined);
export const ComputedSignalSymbol: unique symbol = Symbol(DEV ? 'computed_signal' : undefined);

// ReactiveFlags - 用于 Proxy handler 内部标记
export const ReactiveFlags = {
  IS_REACTIVE: '__v_isReactive',
  IS_READONLY: '__v_isReadonly',
  IS_SHALLOW: '__v_isShallow',
  IS_REF: '__v_isRef',
  RAW: '__v_raw',
  SKIP: '__v_skip',
} as const;

// Track/Trigger 操作类型
export const TrackOpTypes = {
  GET: 'get',
  HAS: 'has',
  ITERATE: 'iterate',
} as const;

export const TriggerOpTypes = {
  SET: 'set',
  ADD: 'add',
  DELETE: 'delete',
  CLEAR: 'clear',
} as const;

// 内部共享常量
export const ITERATE_KEY = Symbol('iterate');
