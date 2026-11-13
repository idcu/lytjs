// @vitest-environment jsdom
/**
 * S24 模块级可变状态隔离：activePinia
 *
 * ## 修复前实测
 *
 * `defineStore` 的 `useStore()` 在没有显式传入 pinia 时只读模块级
 * `activePinia`（`src/pinia.ts:15`）。两个 app 同时 `app.use(pinia)` 时，
 * 后安装的 pinia 覆盖全局，先安装那个 app 的组件拿到的也是**同一个 store**。
 *
 * 虽然 `pinia.install` 已经把 pinia 写进 `app.provide('__lytjs_pinia__')`，
 * 但 `useStore()` 从不查当前 app 的 provides。
 *
 * ## 判据
 *
 * 两个 app 各装一个 pinia、各自在根组件里 `useStore()` 并写自己的值：
 * 修复前两个 app 得到同一个 store（身份相同）；修复后各自独立。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { defineStore, createPinia, clearStoreCache, setActivePinia } from '../src/index';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
  clearStoreCache();
});

function newHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  return host;
}

describe('S24 useStore 按 app 的 pinia 隔离', () => {
  it('两个 app 同时挂载、各自写入不同的值，store 实例与状态互不影响', async () => {
    clearStoreCache();

    const useStore = defineStore('s24AppPiniaIsolation', {
      state: () => ({ who: 'init' }),
    });

    const piniaA = createPinia();
    const piniaB = createPinia();
    const seen: Array<{ who: string }> = [];

    const appA = createApp({
      setup() {
        const store = useStore();
        seen.push(store as unknown as { who: string });
        store.who = 'A';
        return () => h('div', { class: 'who-a' }, store.who);
      },
    });
    appA.use(piniaA);

    const appB = createApp({
      setup() {
        const store = useStore();
        seen.push(store as unknown as { who: string });
        store.who = 'B';
        return () => h('div', { class: 'who-b' }, store.who);
      },
    });
    appB.use(piniaB);

    const hostA = newHost();
    const hostB = newHost();
    await Promise.all([appA.mount(hostA), appB.mount(hostB)]);

    // 修复前：两个 app 都落到 activePinia（后安装的 B）—— 同一个 store，第一条断言红
    expect(seen[0]).not.toBe(seen[1]);
    expect(seen[0].who).toBe('A');
    expect(seen[1].who).toBe('B');
    expect(hostA.querySelector('.who-a')!.textContent).toBe('A');
    expect(hostB.querySelector('.who-b')!.textContent).toBe('B');
  });

  it('同一个 pinia 装入两个 app 后，第二个 app 仍按自己的 provide 解析', async () => {
    clearStoreCache();

    const useStore = defineStore('s24SharedPinia', {
      state: () => ({ who: 'init' }),
    });

    const shared = createPinia();
    const other = createPinia();
    let storeInB: unknown;

    const appA = createApp({
      setup: () => () => h('div', 'a'),
    });
    appA.use(shared);

    const appB = createApp({
      setup() {
        storeInB = useStore();
        return () => h('div', 'b');
      },
    });
    // 同一个 pinia 的第二次 install 不应被实例级 isInstalled 短路
    appB.use(shared);

    // 模拟另一个请求把模块级 activePinia 改写成 other
    setActivePinia(other);
    await appB.mount(newHost());

    // 修复前：appB 没拿到 provide，回落到 activePinia=other ⇒ 解析到别的 pinia 的 store
    expect(storeInB).toBe(useStore(shared));
    expect(storeInB).not.toBe(useStore(other));

    setActivePinia(null as never);
  });
});
