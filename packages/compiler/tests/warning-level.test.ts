/**
 * C-15 判据：警告级别必须接入**真实消费者**
 *
 * 背景：`setWarningLevel/getWarningLevel` 只读写一个模块变量，编译器所有告警
 * 都直接走 `warn()` / `console.warn`，级别从来没有被读取过 ⇒ 用户设置
 * `'silent'` 也无法关闭任何警告，文档里的 `enum WarningLevel { Off/Normal/Verbose }`
 * 更与实现（字符串联合）完全对不上。
 *
 * 本用例把「级别 → 输出通道」钉成可证伪的契约：
 *  - `warn`   → `console.warn`
 *  - `silent` → 两条通道都不输出
 *  - `error`  → `console.error`（提升可见性，不抛出）
 *  - 旧文档的数值枚举 `0/1/2` 作为兼容输入映射到上述字符串级别
 *
 * 负控：修复前 `silent` 用例仍会看到 `console.warn`，`error` 用例看到 0 次
 * `console.error`，因此这些断言必然先红。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setWarningLevel, getWarningLevel } from '../src/index';
import { parse } from '../src/parser';
import { transform, builtInTransforms } from '../src/transform';

/** 触发变换期告警（for.ts：括号语法超过 2 个变量）。 */
const TRANSFORM_WARNING_TEMPLATE = '<div v-for="(a, b, c) in list">{{ a }}</div>';
/** 触发解析期告警（parser-element.ts：非 void 元素自闭合）。 */
const PARSE_WARNING_TEMPLATE = '<div />';

function emitTransformWarning(): void {
  // 与 `compile()` 同一条变换链：不传 builtInTransforms 时 v-for 根本不会被处理。
  transform(parse(TRANSFORM_WARNING_TEMPLATE), { nodeTransforms: builtInTransforms });
}

describe('C-15 警告级别接入真实消费者', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setWarningLevel('warn');
  });

  afterEach(() => {
    setWarningLevel('warn');
    vi.restoreAllMocks();
  });

  it('warn：解析期与变换期告警都走 console.warn', () => {
    emitTransformWarning();
    parse(PARSE_WARNING_TEMPLATE);

    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('silent：两条通道都不输出（负控核心）', () => {
    setWarningLevel('silent');
    emitTransformWarning();
    parse(PARSE_WARNING_TEMPLATE);

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('error：告警提升为 console.error，不再走 console.warn', () => {
    setWarningLevel('error');
    emitTransformWarning();
    parse(PARSE_WARNING_TEMPLATE);

    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('数值枚举兼容：0→silent、2→warn，且真实生效', () => {
    setWarningLevel(0);
    expect(getWarningLevel()).toBe('silent');
    emitTransformWarning();
    expect(warnSpy).not.toHaveBeenCalled();

    setWarningLevel(2);
    expect(getWarningLevel()).toBe('warn');
    emitTransformWarning();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
