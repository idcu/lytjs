/**
 * `<script setup>` 的编译产物（2026-11-01 新增）
 *
 * 背景：此前 `<script setup>` 正文被**原样**拼进模块，而模板产物引用的是 `_ctx.msg`。
 * `msg` 只是模块作用域的局部常量 ⇒ `_ctx.msg` 恒为 undefined ⇒ **整页空白且不报错**。
 *
 * 现在正文被改写成 `setup(__props, { emit: __emit })` 的函数体并 `return` 出顶层绑定。
 * 运行时行为由 `scripts/check-integration.mjs` 的 `[SFC]` 段覆盖（真挂载 + 断言 DOM）。
 */
import { describe, it, expect } from 'vitest';
import { parseSFC } from '../../src/sfc/parse';
import { compileSFC } from '../../src/sfc/compile';

const gen = (source: string): string => {
  const d = parseSFC(source, { filename: 'Test.vue' });
  return compileSFC(d, { filename: 'Test.vue' }).code;
};

describe('<script setup> 编译', () => {
  it('顶层 const / function 被 return 出去', () => {
    const code = gen(`<template><div>{{ msg }}</div></template>
<script setup>
const msg = 'hello'
function inc() { return 1 }
</script>`);
    expect(code).toContain('setup(__props, { emit: __emit })');
    expect(code).toContain("const msg = 'hello'");
    expect(code).toContain('return { msg, inc }');
    expect(code).toContain('render,');
  });

  it('import 提升到模块作用域，不留在 setup 里', () => {
    const code = gen(`<template><div>{{ n }}</div></template>
<script setup>
import { ref } from '@lytjs/core'
const n = ref(0)
</script>`);
    const setupIdx = code.indexOf('setup(__props');
    const importIdx = code.indexOf("import { ref } from '@lytjs/core'");
    expect(importIdx).toBeGreaterThan(-1);
    expect(importIdx).toBeLessThan(setupIdx);
  });

  it('defineProps → options.props + setup 里拿到 props', () => {
    const code = gen(`<template><p>{{ title }}</p></template>
<script setup>
const props = defineProps({ title: String })
</script>`);
    expect(code).toContain('props: { title: String }');
    expect(code).toContain('const props = __props;');
    expect(code).toContain('return { props }');
  });

  it('defineEmits → options.emits + setup 里拿到 emit', () => {
    const code = gen(`<template><button @click="emit('go')">x</button></template>
<script setup>
const emit = defineEmits(['go'])
</script>`);
    expect(code).toContain("emits: ['go']");
    expect(code).toContain('const emit = __emit;');
    expect(code).toContain('return { emit }');
  });

  it('解构声明里的每个名字都要 return', () => {
    const code = gen(`<template><b>{{ x }}{{ y }}</b></template>
<script setup>
const { x, y } = { x: 1, y: 2 }
</script>`);
    expect(code).toContain('return { x, y }');
  });

  it('与 <script> 并存：options 被展开合并', () => {
    const code = gen(`<template><i>{{ a }}</i></template>
<script>
export default { name: 'Merged', inheritAttrs: false }
</script>
<script setup>
const a = 42
</script>`);
    expect(code).toContain("const __options__ = { name: 'Merged'");
    expect(code).toContain('...__options__');
    expect(code).toContain('return { a }');
  });

  it('defineExpose 改写为 setup context 的 __expose（N12）', () => {
    const code = gen(`<template><div/></template>
<script setup>
const value = 1
defineExpose({ value })
</script>`);
    expect(code).toContain('setup(__props, { emit: __emit, expose: __expose })');
    expect(code).toContain('__expose({ value })');
    expect(code).not.toContain('defineExpose(');
    expect(code).toContain('return { value }');
  });

  it('defineExpose 产物真跑：expose 回调确实收到暴露值', () => {
    const code = gen(`<template><div/></template>
<script setup>
const value = 1
defineExpose({ value })
</script>`);
    // 产物含 import / export；剥离后注入模板 helper，真正执行 setup 再断言。
    const body = code.replace(/^import[^\n]*$/gm, '').replace(/^export default/m, 'return');
    const factory = new Function('createElementVNode', body);
    const component = factory(() => ({})) as {
      setup: (props: unknown, ctx: unknown) => unknown;
    };
    expect(typeof component.setup).toBe('function');
    const exposed: Record<string, unknown> = {};
    component.setup(
      {},
      {
        emit: () => {},
        expose: (o: Record<string, unknown>) => Object.assign(exposed, o),
      },
    );
    expect(exposed.value).toBe(1);
  });

  it('泛型 defineProps<...>() → 编译期报错（不产半成品）', () => {
    expect(() =>
      gen(`<template><div/></template>
<script setup>
const props = defineProps<{ title: string }>()
</script>`),
    ).toThrow(/泛型/);
  });

  it('defineProps 返回值不叫 props → 编译期报错', () => {
    expect(() =>
      gen(`<template><div/></template>
<script setup>
const p = defineProps({ a: String })
</script>`),
    ).toThrow(/必须命名为/);
  });

  it('两个 setup 并存 → 编译期报错', () => {
    expect(() =>
      gen(`<template><div/></template>
<script>
export default { setup() { return {} } }
</script>
<script setup>
const a = 1
</script>`),
    ).toThrow(/无法合并/);
  });
});
