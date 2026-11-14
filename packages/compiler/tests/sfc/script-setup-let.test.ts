/**
 * C-32 负控：`<script setup>` 顶层 `let` / `var` 进模板。
 *
 * 两个缺陷：
 * 1. 无初始化器（`let msg;`）此前完全不进 bindings ⇒ 模板 `_ctx.msg` 恒 undefined，
 *    即便后面 `msg = 'hi'` 赋了值也渲染成空白。
 * 2. 有初始化器时能取到初值，但顶层 `let` 不是响应式的：setup 内再赋值不会触发重渲染。
 *    这条无法从运行时修（没有依赖可追踪），因此必须在**编译期**显式告警，不能静默。
 *
 * 判据：`let` 与 `ref` 的编译产物必须给出**可区分**的信号 ——
 * `let` 有告警、`ref` 没有；`let msg;` 必须出现在 return 里。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseSFC } from '../../src/sfc/parse';
import { compileSFC } from '../../src/sfc/compile';

const gen = (source: string): string => {
  const d = parseSFC(source, { filename: 'Test.vue' });
  return compileSFC(d, { filename: 'Test.vue' }).code;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('C-32 顶层 let / var', () => {
  it('无初始化器的顶层 let 也要进 return（否则模板静默 undefined）', () => {
    // 本用例只关心绑定收集，静音预期内的响应式告警
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const code = gen(`<template><div>{{ msg }}</div></template>
<script setup>
let msg;
msg = 'hi'
</script>`);

    expect(code).toContain('return { msg }');
    expect(code).toContain('_ctx.msg');
  });

  it('顶层 let 被模板引用时，编译期必须告警并且点名该绑定', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    gen(`<template><div>{{ count }}</div></template>
<script setup>
let count = 0
function inc() { count++ }
</script>`);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('count');
    expect(warn.mock.calls[0]![0]).toContain('ref()');
  });

  it('对照组：ref 绑定不得触发该告警（避免误伤推荐写法）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    gen(`<template><div>{{ count }}</div></template>
<script setup>
import { ref } from '@lytjs/core'
const count = ref(0)
</script>`);

    expect(warn).not.toHaveBeenCalled();
  });

  it('对照组：顶层 let 未被模板引用时不得告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    gen(`<template><div>static</div></template>
<script setup>
let scratch = 0
scratch = 1
</script>`);

    expect(warn).not.toHaveBeenCalled();
  });
});
