// src/constants.ts
// 内部符号常量

// DEV 检测方式说明：
// 统一使用 typeof 检测方式，兼容编译时 define/replace 替换和未配置构建替换的场景。
// 当打包工具（如 rollup/esbuild）通过 define 插件将 __DEV__ 替换为字面量 true/false 时，
// typeof 检测会被优化为直接的字面量判断，实现死代码消除（DCE）。
// 当未配置构建替换时，typeof 检测也能安全降级为 false，避免 ReferenceError。
const DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

export const RefSymbol: unique symbol = Symbol(DEV ? 'ref' : undefined);
export const ShallowRefSymbol: unique symbol = Symbol(DEV ? 'shallow_ref' : undefined);
export const ComputedRefSymbol: unique symbol = Symbol(DEV ? 'computed_ref' : undefined);
export const ReactiveSymbol: unique symbol = Symbol(DEV ? 'reactive' : undefined);
export const ReadonlySymbol: unique symbol = Symbol(DEV ? 'readonly' : undefined);
// ★ 2026-10-03：`SignalSymbol` / `ComputedSignalSymbol` 改为**全局注册**符号。
//
// 为什么要改：模板插值（`{{ count }}`）走 vdom 的 `toDisplayString`，而
// `signal()` 返回的是**可调用**对象 ⇒ 原先被当普通值 stringify，页面上出现
// 一整坨函数源码，且插值处没「读」它 ⇒ 未建立依赖 ⇒ 更新也不触发。
//
// 而 vdom **明确不依赖 `@lytjs/reactivity`**（保持渲染层零交叉依赖），
// 所以它无法 import 本文件的品牌标记。解法沿用**本仓已有的先例**：
// `@lytjs/common-vnode` 就是用 `Symbol.for('Teleport')` 让 vdom 与 component
// 在**没有直接依赖**的前提下识别同一个内置物（见 Teleport 的分派桥）。
// 这里同理 —— 全局注册让「品牌」可跨包识别，而不引入依赖边。
export const SignalSymbol: unique symbol = Symbol.for('lytjs:signal') as typeof SignalSymbol;
export const ComputedSignalSymbol: unique symbol = Symbol.for(
  'lytjs:computed_signal',
) as typeof ComputedSignalSymbol;

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
