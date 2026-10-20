// @vitest-environment jsdom
/**
 * e2e 判据：同名公开 API **只有一份权威实现**（ADR 0011）
 *
 * ## 为什么要有这条
 *
 * `defineAsyncComponent` 曾有 **3 份平行实现**（`component` / `core` / `core-vnode`），
 * 且「修复只落一份」已实测发生两次（`delay` 语义、`showLoading` 非响应式 ⇒ loading 永不出现；
 * 后者至今未同步到 `core-vnode`）。⇒ 本文件用**函数同一性**把结构钉死：
 * 任何入口一旦重新出现副本，这里立刻变红，不再依赖人肉 diff。
 *
 * ⚠️ 本文件走各包的 **dist / src 入口**（vitest alias）；改 src 后需重建对应 dist（硬约束 3）。
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import * as core from '@lytjs/core';
import * as coreVnode from '@lytjs/core-vnode';
import * as component from '@lytjs/component';
import { createApp, h, defineAsyncComponent } from '@lytjs/core';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
  vi.restoreAllMocks();
});

const flush = (ms = 40): Promise<void> => new Promise((r) => setTimeout(r, ms));

const Comp = { name: 'Real', render: () => h('div', { class: 'real' }, 'REAL') };
const ErrComp = { name: 'Err', render: () => h('div', { class: 'err' }, 'ERR') };

async function mount(node: () => unknown): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({ render: node } as never).mount(host);
  return host;
}

describe('同名公开 API 只有一份权威实现（ADR 0011）', () => {
  it('★ core.defineAsyncComponent 必须与 component 的是**同一函数**', () => {
    expect(core.defineAsyncComponent).toBe(component.defineAsyncComponent);
  });

  it('★ core-vnode.defineAsyncComponent 必须与 component 的是**同一函数**', () => {
    expect(coreVnode.defineAsyncComponent).toBe(component.defineAsyncComponent);
  });

  it('★ core 必须转发 preload 系列（此前漏转 ⇒ 主入口用户拿不到）', () => {
    const keys = [
      'preloadComponent',
      'preloadComponents',
      'isComponentPreloaded',
      'clearPreloadCache',
    ] as const;
    for (const k of keys) {
      expect((core as Record<string, unknown>)[k]).toBe((component as Record<string, unknown>)[k]);
    }
  });

  // ── Web Component 系列（2026-10-21 收敛）──────────────────────────────
  // `core/src/web-component.ts` 曾是 `core-vnode` 的**平行副本**，且两份都因
  // 「渲染器没注入 setupChildComponent」而**渲染为空**。现统一以 core-vnode 为权威。
  it('★ core 的 Web Component API 必须与 core-vnode 的是**同一函数**', () => {
    const keys = [
      'defineCustomElement',
      'useShadowRoot',
      'useHost',
      'useWebComponentSlots',
      'injectChildStyles',
    ] as const;
    for (const k of keys) {
      expect((core as Record<string, unknown>)[k]).toBe((coreVnode as Record<string, unknown>)[k]);
    }
  });
});

describe('defineAsyncComponent — retry 契约（onError(error, retry, fail, attempts)）', () => {
  it('★ 首次失败、onError 同步 retry() 后成功 ⇒ 渲染真实组件（attempts=1）', async () => {
    let calls = 0;
    const attemptsSeen: number[] = [];
    const w = defineAsyncComponent({
      loader: async () => {
        calls++;
        if (calls === 1) throw new Error('boom');
        return Comp;
      },
      onError: (_err, retry, _fail, attempts) => {
        attemptsSeen.push(attempts);
        retry();
      },
      delay: 0,
    });

    const host = await mount(() => h(w as never));
    await flush(80);

    expect(attemptsSeen).toEqual([1]);
    expect(host.querySelector('.real')).toBeTruthy();
  });

  it('★ 恒失败且 onError 恒 retry() ⇒ 重试有上限，最终显示 errorComponent', async () => {
    let calls = 0;
    const attemptsSeen: number[] = [];
    const w = defineAsyncComponent({
      loader: async () => {
        calls++;
        throw new Error('always');
      },
      errorComponent: ErrComp,
      onError: (_err, retry, _fail, attempts) => {
        attemptsSeen.push(attempts);
        retry();
      },
      delay: 0,
    });

    const host = await mount(() => h(w as never));
    await flush(120);

    expect(calls).toBe(3); // MAX_ATTEMPTS = 3：不会无限重试
    expect(attemptsSeen).toEqual([1, 2, 3]);
    expect(host.querySelector('.err')).toBeTruthy();
  });

  it('★ onError 调 fail() ⇒ 显示 errorComponent', async () => {
    const w = defineAsyncComponent({
      loader: async () => {
        throw new Error('nope');
      },
      errorComponent: ErrComp,
      onError: (_err, _retry, fail) => fail(),
      delay: 0,
    });

    const host = await mount(() => h(w as never));
    await flush(60);

    expect(host.querySelector('.err')).toBeTruthy();
  });

  it('★ 只声明 (error) 的旧用法 ⇒ 立即进入错误态（零回归，不等待决策）', async () => {
    const seen: unknown[] = [];
    const w = defineAsyncComponent({
      loader: async () => {
        throw new Error('legacy');
      },
      errorComponent: ErrComp,
      onError: (err: Error) => seen.push(err.message),
      delay: 0,
    });

    const host = await mount(() => h(w as never));
    await flush(60);

    expect(seen).toEqual(['legacy']);
    expect(host.querySelector('.err')).toBeTruthy();
  });

  it('★ loader 返回非法值 ⇒ 按失败处理（core 版下沉的校验）', async () => {
    const w = defineAsyncComponent({
      loader: (async () => 42) as never,
      errorComponent: ErrComp,
      delay: 0,
    });

    const host = await mount(() => h(w as never));
    await flush(60);

    expect(host.querySelector('.err')).toBeTruthy();
  });
});
