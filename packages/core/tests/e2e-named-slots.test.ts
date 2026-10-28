// @vitest-environment jsdom
/**
 * 端到端门禁：**具名插槽与作用域插槽**（`<template #name>` / `#default="{ item }"`）
 *
 * ## 为什么需要这个文件
 *
 * 直到 2026-10-28，这套编译器的具名插槽是**语法存在、语义不存在**：
 *
 * - `#header` 能被正确解析（`DirectiveNode{ name: 'slot', arg: 'header' }`）；
 * - 但 transform 层完全忽略它 ⇒ `<template #header>` 被当成普通 `<template>` 元素
 *   ⇒ 内容是**惰性元素**里的内容 ⇒ 页面上什么都没有，且**不报错**。
 *
 * 更讽刺的是 `JS_FUNCTION_EXPRESSION` 这个 NodeType 与 `JSFunctionExpression` 类型
 * **早就在仓库里**（constants 14 / types.ts:189，字段含 `params` / `returns` / `isSlot`），
 * 但既没有工厂也没有 codegen 分支 —— 它是「为插槽预留、从未实现」的空壳。
 *
 * 本文件钉住三件事：
 *   ① 具名插槽的内容真的进了对应的 `slots.name`；
 *   ② 默认插槽吃「剩下的子节点」，且不夹带模板缩进；
 *   ③ 作用域参数是**真绑定**（`item` 不能被改写成 `_ctx.item`）。
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

/** 把各插槽渲染到带标记的容器里，便于断言「内容进了哪个槽」 */
const Slots = {
  setup(_p: unknown, ctx: { slots: Record<string, (p?: unknown) => unknown[]> }) {
    return () =>
      h('div', { class: 'box' }, [
        h('header', { class: 'h' }, (ctx.slots.header?.() ?? []) as never),
        h('main', { class: 'm' }, (ctx.slots.default?.() ?? []) as never),
        h('footer', { class: 'f' }, (ctx.slots.footer?.() ?? []) as never),
      ]);
  },
};

describe('具名插槽（模板写法）', () => {
  it('`<template #header>` 的内容必须进 header 槽', async () => {
    const el = await mountApp({
      components: { Slots },
      template:
        '<div id="app"><Slots><template #header><b class="hb">H</b></template><i class="db">D</i></Slots></div>',
    });

    expect(el.querySelector('.h .hb')).not.toBeNull();
    // 具名插槽的内容**不能**泄漏到默认插槽
    expect(el.querySelector('.m .hb')).toBeNull();
  });

  it('剩余子节点进默认插槽，且不夹带模板缩进', async () => {
    const el = await mountApp({
      components: { Slots },
      template: `
        <div id="app">
          <Slots>
            <template #header><b>H</b></template>
            <i class="db">D</i>
          </Slots>
        </div>`,
    });

    const main = el.querySelector('.m')!;
    expect(main.querySelector('.db')).not.toBeNull();
    // 默认插槽里不应出现整段缩进文本
    expect((main.textContent ?? '').trim()).toBe('D');
  });

  it('多个具名插槽各进各的', async () => {
    const el = await mountApp({
      components: { Slots },
      template:
        '<div id="app"><Slots><template #header><b class="hb">H</b></template><template #footer><small class="fb">F</small></template></Slots></div>',
    });

    expect(el.querySelector('.h .hb')).not.toBeNull();
    expect(el.querySelector('.f .fb')).not.toBeNull();
    expect(el.querySelector('.m .hb')).toBeNull();
    expect(el.querySelector('.m .fb')).toBeNull();
  });

  it('具名插槽里可以用 v-if（内容是活的，不是静态快照）', async () => {
    const ok = ref(true);
    const el = await mountApp({
      components: { Slots },
      setup() {
        return { ok };
      },
      template:
        '<div id="app"><Slots><template #header><b v-if="ok" class="hb">H</b><i v-else class="hb2">N</i></template></Slots></div>',
    });

    expect(el.querySelector('.h .hb')).not.toBeNull();

    ok.value = false;
    await flush();
    expect(el.querySelector('.h .hb')).toBeNull();
    expect(el.querySelector('.h .hb2')).not.toBeNull();
  });

  it('只给具名插槽、不给默认内容时，default 槽为空（不报错）', async () => {
    const el = await mountApp({
      components: { Slots },
      template:
        '<div id="app"><Slots><template #header><b class="hb">H</b></template></Slots></div>',
    });

    expect(el.querySelector('.h .hb')).not.toBeNull();
    expect(el.querySelector('.m')!.textContent).toBe('');
  });
});

describe('作用域插槽（模板写法）', () => {
  const Scoped = {
    setup(_p: unknown, ctx: { slots: Record<string, (p?: unknown) => unknown[]> }) {
      return () =>
        h('div', { class: 'sc' }, (ctx.slots.default?.({ item: 'ITEM', idx: 7 }) ?? []) as never);
    },
  };

  it('`#default="{ item }"` 里的 item 必须能取到作用域值', async () => {
    const el = await mountApp({
      components: { Scoped },
      template:
        '<div id="app"><Scoped><template #default="{ item }"><b class="it">{{ item }}</b></template></Scoped></div>',
    });

    expect(el.querySelector('.sc .it')!.textContent).toBe('ITEM');
  });

  it('多个解构字段都能用', async () => {
    const el = await mountApp({
      components: { Scoped },
      template:
        '<div id="app"><Scoped><template #default="{ item, idx }"><b class="it">{{ item }}-{{ idx }}</b></template></Scoped></div>',
    });

    expect(el.querySelector('.sc .it')!.textContent).toBe('ITEM-7');
  });

  it('作用域参数**不能**被改写成 _ctx.item（编译期判据）', () => {
    const { code } = compile(
      '<div><Scoped><template #default="{ item }"><b>{{ item }}</b></template></Scoped></div>',
    );

    expect(code).toContain('toDisplayString(item)');
    expect(code).not.toContain('_ctx.item');
  });
});

describe('仍未实现的形态：组件标签上的 v-slot', () => {
  it('`<Child v-slot="{ x }">` 仍告警，且提示改用 `<template #name>`', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    compile('<div><Child v-slot="{ x }"><b>{{ x }}</b></Child></div>');

    const said = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(said).toContain('v-slot');
    expect(said).toContain('<template #name>');
  });

  it('`<template #header>` 不再告警（已实现）', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    compile('<div><Child><template #header><b>H</b></template></Child></div>');

    const said = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(said).not.toContain('尚未实现');
  });
});
