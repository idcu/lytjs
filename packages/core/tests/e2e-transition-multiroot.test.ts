// @vitest-environment jsdom
/**
 * 端到端判据：`<Transition>` 包**多根组件**时，每个根元素都要播过渡
 *
 * ## 修之前实测
 *
 * `patch-component` 把过渡钩子从组件 vnode 下沉到 `subTree` 时，只处理
 * 「`subTree` 是**元素**」这一种形态：
 *
 * ```
 * <Transition><Box/></Transition>        → 有动画（subTree 是 div）
 * <Transition><MultiRoot/></Transition>  → 没动画，也不报错（subTree 是 Fragment）
 * ```
 *
 * 多根组件在真实项目里很常见（布局组件、`<template>` 直出两个兄弟节点、
 * 以及本仓 `Transition` 自己的 `() => slots.default?.()` 形态）。
 * 钩子被静默丢弃 ⇒ 用户只会看到「别的组件有动画，这个没有」。
 *
 * ## 判据怎么观察
 *
 * 与 `e2e-transition-component-child.test.ts` 同一套：根元素带内联
 * `transition-duration: 100ms` ⇒ 过渡异步完成，类名可观察。
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, h, ref, Transition } from '../src/index';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
  vi.restoreAllMocks();
});

function newHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  return host;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BOX = 'transition-duration: 100ms';

/** 渲染函数返回**两个**根元素（多根组件） */
const Multi = {
  setup() {
    return () => [
      h('div', { class: 'root-a', style: BOX }, 'A'),
      h('div', { class: 'root-b', style: BOX }, 'B'),
    ];
  },
};

/** 多根 + 中间夹一个文本节点（Fragment children 不全是元素） */
const MultiWithText = {
  setup() {
    return () => [
      h('div', { class: 'root-a', style: BOX }, 'A'),
      'plain text',
      h('div', { class: 'root-b', style: BOX }, 'B'),
    ];
  },
};

describe('<Transition> 的子节点是多根组件', () => {
  it('挂载时（appear）**两个**根元素都要播 enter', async () => {
    const host = newHost();
    await createApp({
      components: { Transition, Multi },
      setup() {
        return { on: true };
      },
      template: `<div id="app"><Transition name="fade" appear><Multi v-if="on" /></Transition></div>`,
    } as never).mount(host);

    const a = host.querySelector('.root-a')!;
    const b = host.querySelector('.root-b')!;
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();

    expect(a.className).toContain('fade-enter-active');
    expect(b.className).toContain('fade-enter-active');

    await wait(250);
    expect(a.className).not.toContain('fade-enter-active');
    expect(b.className).not.toContain('fade-enter-active');
  });

  it('v-if 让多根组件出现时，两个根元素都要播 enter', async () => {
    const on = ref(false);
    const host = newHost();
    const app = createApp({
      components: { Transition, Multi },
      setup() {
        return { on };
      },
      template: `<div id="app"><Transition name="fade"><Multi v-if="on" /></Transition></div>`,
    } as never);
    await app.mount(host);

    expect(host.querySelector('.root-a')).toBeNull();

    on.value = true;
    await wait(50);

    const a = host.querySelector('.root-a')!;
    const b = host.querySelector('.root-b')!;
    expect(a.className).toContain('fade-enter-active');
    expect(b.className).toContain('fade-enter-active');

    await wait(250);
    expect(a.className).not.toContain('fade-enter-active');
  });

  it('v-if 让多根组件消失时，两个根元素都要播 leave 并最终移除', async () => {
    const on = ref(true);
    const host = newHost();
    const app = createApp({
      components: { Transition, Multi },
      setup() {
        return { on };
      },
      template: `<div id="app"><Transition name="fade"><Multi v-if="on" /></Transition></div>`,
    } as never);
    await app.mount(host);
    await wait(250);

    const a = host.querySelector('.root-a')!;
    const b = host.querySelector('.root-b')!;

    on.value = false;
    await wait(50);

    // leave 期间：两个元素都还在，且都带着 leave 类名
    expect(a.isConnected).toBe(true);
    expect(b.isConnected).toBe(true);
    expect(a.className).toContain('fade-leave-active');
    expect(b.className).toContain('fade-leave-active');

    await wait(300);
    expect(host.querySelector('.root-a')).toBeNull();
    expect(host.querySelector('.root-b')).toBeNull();
  });

  it('多根里夹着文本节点时不得崩，且元素照常播过渡', async () => {
    const host = newHost();
    await createApp({
      components: { Transition, MultiWithText },
      setup() {
        return { on: true };
      },
      template: `<div id="app"><Transition name="fade" appear><MultiWithText v-if="on" /></Transition></div>`,
    } as never).mount(host);

    const a = host.querySelector('.root-a')!;
    const b = host.querySelector('.root-b')!;
    expect(a.className).toContain('fade-enter-active');
    expect(b.className).toContain('fade-enter-active');
    expect(host.textContent).toContain('plain text');
  });

  /**
   * `mode="out-in"` + 多根：**必须等所有根元素 leave 播完**再进新内容。
   *
   * 多根会把同一份钩子分发给 N 个元素 ⇒ `leave` 被调 N 次。若 `finishLeave()`
   * 挂在**每一个** leave 的完成回调上，最先结束的那个（这里 100ms）就会把排队
   * 的子节点扶正 —— 而另一个根元素还要再播 300ms ⇒ `out-in` 退化成「部分重叠」。
   *
   * 用**不等时长**（100ms / 400ms）才看得出来：等长时两者几乎同时结束，bug 不可见。
   */
  it('out-in + 多根：要等**最慢**的那个根元素 leave 播完才进新内容', async () => {
    const Slow = {
      setup() {
        return () => [
          h('div', { class: 'old-a', style: 'transition-duration: 100ms' }, 'A'),
          h('div', { class: 'old-b', style: 'transition-duration: 400ms' }, 'B'),
        ];
      },
    };
    const Next = {
      setup() {
        return () => h('div', { class: 'new' }, 'N');
      },
    };

    const kind = ref<'old' | 'new'>('old');
    const host = newHost();
    await createApp({
      components: { Transition, Slow, Next },
      setup() {
        return { kind };
      },
      template:
        `<div id="app"><Transition name="fade" mode="out-in">` +
        `<Slow v-if="kind === 'old'" /><Next v-else />` +
        `</Transition></div>`,
    } as never).mount(host);

    expect(host.querySelector('.old-a')).not.toBeNull();

    kind.value = 'new';
    await wait(180); // 已经越过最快的那个（100ms），但离最慢的（400ms）还早

    expect(host.querySelector('.new')).toBeNull();
    expect(host.querySelector('.old-b')).not.toBeNull();

    await wait(400);
    expect(host.querySelector('.new')).not.toBeNull();
    expect(host.querySelector('.old-a')).toBeNull();
    expect(host.querySelector('.old-b')).toBeNull();
  });
});
