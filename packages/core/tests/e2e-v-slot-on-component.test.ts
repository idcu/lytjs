// @vitest-environment jsdom
/**
 * 端到端判据：`v-slot` 直接写在**组件标签**上
 *
 * ## 修之前实测
 *
 * ```
 * <Child v-slot="{ item }"><b>{{ item }}</b></Child>
 *   → createBlock(_ctx.Child, null, createBlock("b", null, toDisplayString(_ctx.item)))
 *                                     ↑ 子节点当普通 children 传下去；`item` 被改写成 `_ctx.item`
 *   → 渲染出空（`_ctx.item` 是 undefined），**且不报错**
 *
 * <Child v-slot:header><b>H</b></Child>
 *   → 内容进了 **default** 槽，`header` 槽是空的（指令被静默丢弃）
 * ```
 *
 * 这是模板编译器里最后一个「语法能写、语义不存在」的形态。
 * `<template #name>` 早在 §22 就实现了，这条是它的「兄弟写法」。
 *
 * ## 语义（与 Vue 一致）
 *
 * - 组件标签上的 `v-slot` ⇒ 组件的**全部**子节点都进这个槽；
 * - 不带参数 ⇒ `default`；带参数（`v-slot:header`）⇒ 具名槽；
 * - 带表达式（`v-slot="{ item }"`）⇒ 作用域参数，必须登记为**局部名**
 *   （否则 `{{ item }}` 会被改写成 `_ctx.item`）。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, nextTick, ref } from '../src/index';
import { compile } from '@lytjs/compiler';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

function newHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  return host;
}

/** 把两个槽都渲染出来的消费者（便于断言「进的是哪个槽」） */
const Dual = {
  setup(_p: unknown, { slots }: { slots: Record<string, (p?: unknown) => unknown[]> }) {
    return () =>
      h('div', { class: 'dual' }, [
        h('header', { class: 'h' }, (slots.header?.() ?? []) as never),
        h('main', { class: 'm' }, (slots.default?.() ?? []) as never),
      ]);
  },
};

const Scoped = {
  setup(_p: unknown, { slots }: { slots: { default?: (p: unknown) => unknown[] } }) {
    return () => h('div', { class: 'scoped' }, (slots.default?.({ item: 'ITEM' }) ?? []) as never);
  },
};

describe('`v-slot` 写在组件标签上', () => {
  it('不带参数：全部子节点进 default 槽', async () => {
    const host = newHost();
    await createApp({
      components: { Dual },
      template: `<div id="app"><Dual v-slot><b class="x">X</b></Dual></div>`,
    } as never).mount(host);
    await nextTick();

    expect(host.querySelector('.m .x')).not.toBeNull();
    expect(host.querySelector('.h .x')).toBeNull();
  });

  it('带参数：进对应的**具名**槽（此前会错进 default）', async () => {
    const host = newHost();
    await createApp({
      components: { Dual },
      template: `<div id="app"><Dual v-slot:header><b class="x">H</b></Dual></div>`,
    } as never).mount(host);
    await nextTick();

    expect(host.querySelector('.h .x')).not.toBeNull();
    expect(host.querySelector('.m .x')).toBeNull();
  });

  it('作用域参数可用（此前 `item` 被改写成 `_ctx.item` ⇒ 渲染空）', async () => {
    const host = newHost();
    await createApp({
      components: { Scoped },
      template: `<div id="app"><Scoped v-slot="{ item }"><b class="x">{{ item }}</b></Scoped></div>`,
    } as never).mount(host);
    await nextTick();

    expect(host.querySelector('.x')!.textContent).toBe('ITEM');
  });

  it('作用域参数是**局部名**：不会被改写成 `_ctx.item`（编译期判据）', () => {
    const { code } = compile('<div><Scoped v-slot="{ item }"><b>{{ item }}</b></Scoped></div>');

    expect(code).toContain('({ item }) =>');
    expect(code).toContain('toDisplayString(item)');
    expect(code).not.toContain('_ctx.item');
  });

  it('子节点里的响应式绑定照常更新', async () => {
    const msg = ref('A');
    const host = newHost();
    await createApp({
      components: { Scoped },
      setup() {
        return { msg };
      },
      template: `<div id="app"><Scoped v-slot="{ item }"><b class="x">{{ item }}-{{ msg }}</b></Scoped></div>`,
    } as never).mount(host);
    await nextTick();

    expect(host.querySelector('.x')!.textContent).toBe('ITEM-A');

    msg.value = 'B';
    await nextTick();
    expect(host.querySelector('.x')!.textContent).toBe('ITEM-B');
  });

  it('`v-slot` 不得作为属性泄漏到 DOM 上', async () => {
    const host = newHost();
    await createApp({
      components: { Dual },
      template: `<div id="app"><Dual v-slot:header><b>H</b></Dual></div>`,
    } as never).mount(host);
    await nextTick();

    expect(host.innerHTML).not.toContain('v-slot');
  });

  it('与 `<template #name>` 混用时，两种写法各自生效', async () => {
    const host = newHost();
    await createApp({
      components: { Dual },
      template: `<div id="app"><Dual v-slot:header><b class="x">H</b></Dual></div>`,
    } as never).mount(host);
    await nextTick();
    expect(host.querySelector('.h .x')).not.toBeNull();

    const host2 = newHost();
    await createApp({
      components: { Dual },
      template: `<div id="app"><Dual><template #header><b class="y">H2</b></template><i class="z">D</i></Dual></div>`,
    } as never).mount(host2);
    await nextTick();
    expect(host2.querySelector('.h .y')).not.toBeNull();
    expect(host2.querySelector('.m .z')).not.toBeNull();
  });
});
