// src/effect-scope-registrar.ts
// effect 和 effect-scope 的共享类型注册器
// 用于打破 effect.ts <-> effect-scope.ts 的循环依赖

import type { ReactiveEffect } from "./effect";

/**
 * effectScope 收集的条目类型
 * - ReactiveEffect: 响应式副作用
 * - EffectScope: 嵌套的子 scope
 */
export type EffectScopeEntry = ReactiveEffect | import("./effect-scope").EffectScope;
