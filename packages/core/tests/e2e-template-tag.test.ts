// @vitest-environment jsdom
/**
 * 端到端门禁：`<template>` 标签的正确语义（**Fragment**，不是元素）
 *
 * ## 为什么需要这个文件
 *
 * `<template v-if>` / `<template v-for>` 是最常见的「分组」写法（一次控制多个节点，
 * 而不引入额外 DOM 层级）。它依赖一个前提：**`<template>` 编译成 Fragment**。
 *
 * 实测（2026-10-28）：编译器把 `<template>` 当成**普通元素**，产物是
 * `createElementVNode("template", null, …)`。而 `<template>` 在浏览器里是
 * **惰性元素**（inert）—— 它的子内容根本不渲染。于是：
 *
 * ```
 * <div><template v-if="ok">A</template></div>
 *   → <div><template>A</template></div>     ← DOM 里有，页面上看不见
 * ```
 *
 * 这比「完全不渲染」更隐蔽：DOM 树里**能看到内容**，DevTools 里也正常，
 * 只有用户在页面上看不到 —— 排查时会先怀疑样式、再怀疑层级，很难想到是标签语义。
 *
 * 同一批还确认了**具名/作用域插槽语法尚未实现**（`<template #header>`）：
 * 语法能被解析（`#header` → `v-slot:header`），但 transform 层完全忽略它。
 * 本文件把这条**钉成「必须告警」**，而不是钉成「渲染成空」——
 * 后者等于把缺陷写成断言；前者在将来实现该特性时会立刻变红，逼着删除告警。
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, h, ref, nextTick } from '../src/index';
import { compile } from '@lytjs/compiler';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const el of hosts.splice(0)) el.remove();
  vi.restoreAllMocks();
});

async function flush(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 20));
}

async function mountApp(comp: unknown): Promise<HTMLElement> {
  const el = document.createElement('div');
  document.body.appendChild(el);
  hosts.push(el);
  await createApp(comp as never).mount(el);
  await flush();
  return el;
}

describe('<template> 是 Fragment（不是惰性元素）', () => {
  it('`<template v-if>` 的内容必须可见', async () => {
    const el = await mountApp({
      setup() {
        return { ok: true };
      },
      template: '<div id="app"><template v-if="ok"><b class="t">A</b></template></div>',
    });

    expect(el.querySelector('.t')).not.toBeNull();
    expect(el.textContent).toContain('A');
    // 不得残留惰性 <template> 元素（那正是旧行为的证据）
    expect(el.querySelector('template')).toBeNull();
  });

  it('`<template v-else>` 分支同样可见', async () => {
    const el = await mountApp({
      setup() {
        return { ok: false };
      },
      template:
        '<div id="app"><template v-if="ok"><b>A</b></template><template v-else><i class="e">B</i></template></div>',
    });

    expect(el.querySelector('.e')).not.toBeNull();
    expect(el.textContent).toContain('B');
  });

  it('`<template v-for>` 要展开成多个节点（且顺序正确）', async () => {
    const el = await mountApp({
      setup() {
        return { list: ['a', 'b', 'c'] };
      },
      template:
        '<div id="app"><template v-for="x in list"><i class="row">{{ x }}</i></template></div>',
    });

    const rows = el.querySelectorAll('.row');
    expect(rows.length).toBe(3);
    expect(Array.from(rows).map((r) => r.textContent)).toEqual(['a', 'b', 'c']);
  });

  it('切换 v-if 后内容要跟着消失（不是只渲染一次）', async () => {
    const ok = ref(true);
    const el = await mountApp({
      setup() {
        return { ok };
      },
      template: '<div id="app"><template v-if="ok"><b class="t">A</b></template></div>',
    });

    expect(el.querySelector('.t')).not.toBeNull();

    ok.value = false;
    await flush();
    expect(el.querySelector('.t')).toBeNull();
    expect(el.querySelector('template')).toBeNull();
  });

  it('组件里的 `<template>` 作为默认子节点（内容进 slots.default）', async () => {
    const Child = {
      setup(_p: unknown, ctx: { slots: Record<string, () => unknown[]> }) {
        return () => h('div', { class: 'child' }, (ctx.slots.default?.() ?? []) as never);
      },
    };

    const el = await mountApp({
      components: { Child },
      setup() {
        return { ok: true };
      },
      template:
        '<div id="app"><Child><template v-if="ok"><b class="t">A</b></template></Child></div>',
    });

    expect(el.querySelector('.child .t')).not.toBeNull();
  });

  it('产物必须是 Fragment（编译期判据，不依赖运行时）', () => {
    const { code, preamble } = compile('<div><template v-if="ok">A</template></div>');

    expect(code).toContain('Fragment');
    expect(code).not.toContain('"template"');
    // helper 必须在 preamble 里被 import，否则产物里是裸标识符
    expect(preamble).toContain('Fragment');
  });
});

describe('具名 / 作用域插槽', () => {
  // ⚠️ 2026-10-28 更新：`<template #name>` 已经**实现**（见 e2e-named-slots.test.ts）。
  // 本文件此前断言「必须告警」—— 那是「实现之前不许沉默」的临时哨兵，
  // 实现之后它如约变红，逼着把哨兵换成真实断言。现在只保留「仍未实现的形态」的告警。
  it('组件标签上的 v-slot **已实现**：不再告警，且产出插槽对象', () => {
    // ⚠️ 2026-10-30 契约变更：此前这里断言「必须告警（该形态未实现）」——
    // 那是「实现之前不许沉默」的临时哨兵。现在 `<Child v-slot="{ x }">` 真正编译成
    // `{ "default": ({ x }) => [...] }`，哨兵如约变红，换成真实行为断言。
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { code } = compile('<div><Child v-slot="{ x }"><b>{{ x }}</b></Child></div>');

    const said = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(said).not.toContain('v-slot');
    expect(code).toContain('({ x }) =>');
    expect(code).toContain('toDisplayString(x)');
  });

  it('普通子节点不得触发告警（避免噪声）', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    compile('<div><Child><b>plain</b></Child></div>');

    const said = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(said).not.toContain('尚未实现');
  });
});
