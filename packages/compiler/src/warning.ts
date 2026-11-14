// src/warning.ts
// 编译期告警级别与唯一输出通道（C-15）
//
// 背景：`setWarningLevel/getWarningLevel` 此前只读写一个模块变量，而编译器所有
// 告警都直接走 `warn()` / `console.warn`，级别从未被读取 ⇒ 用户设置 `'silent'`
// 也关不掉任何警告。文档里公开的又是 `enum WarningLevel { Off=0, Normal=1,
// Verbose=2 }`，与实现的字符串联合完全对不上（类型/文档/行为三方漂移）。
//
// 现在收敛为：
//  - 字符串联合是唯一真源；
//  - 旧文档的数值枚举仅作为兼容输入映射到字符串；
//  - 所有编译期告警统一经 `compilerWarn()` 输出，级别在此真实生效。

import { getDevMode, warn as devWarn } from '@lytjs/common-error';

/** 警告级别（唯一真源）。 */
export type WarningLevel = 'silent' | 'error' | 'warn';

/**
 * 旧文档公开过的数值枚举（Off=0 / Normal=1 / Verbose=2）。
 *
 * 仅作为 `setWarningLevel` 的兼容输入保留：`Verbose` 没有独立实现，
 * 与 `Normal` 一样映射到 `'warn'`。
 */
export type NumericWarningLevel = 0 | 1 | 2;

const NUMERIC_WARNING_LEVELS: Record<NumericWarningLevel, WarningLevel> = {
  0: 'silent',
  1: 'warn',
  2: 'warn',
};

// 跨入口共享：warning.ts 被 index/sfc/signal/ssr/wasm 五个入口内联，
// 模块级变量会让主入口 setWarningLevel 对子入口 compilerWarn 静默失效。
const WARNING_LEVEL_SLOT = Symbol.for('@lytjs/compiler/warning-level');

function warningLevelState(): { level: WarningLevel } {
  const existing = Reflect.get(globalThis, WARNING_LEVEL_SLOT) as
    | { level: WarningLevel }
    | undefined;
  if (existing) return existing;
  const created = { level: 'warn' as WarningLevel };
  Reflect.set(globalThis, WARNING_LEVEL_SLOT, created);
  return created;
}

/**
 * 设置编译期告警级别。
 *
 * 接受字符串级别（真源）或旧文档的数值枚举（0→silent，1/2→warn）。
 */
export function setWarningLevel(level: WarningLevel | NumericWarningLevel): void {
  warningLevelState().level = typeof level === 'number' ? NUMERIC_WARNING_LEVELS[level] : level;
}

/** 读取当前告警级别（始终返回字符串真源，数值输入已被映射）。 */
export function getWarningLevel(): WarningLevel {
  return warningLevelState().level;
}

/**
 * 编译期告警的唯一出口。
 *
 * - `silent`：静默；
 * - `warn`：`console.warn`（保留 `@lytjs/common-error` 的开发模式判定）；
 * - `error`：`console.error`（提升可见性，不抛出 —— 把诊断变成新的失败模式
 *   属于语义变更，不在缺陷修复范围内）。
 */
export function compilerWarn(message: string): void {
  const level = warningLevelState().level;
  if (level === 'silent' || !getDevMode()) return;
  if (level === 'error') {
    console.error(`[LytJS]: ${message}`);
    return;
  }
  devWarn(message);
}
