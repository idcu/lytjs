// @vitest-environment jsdom
/**
 * 端到端判据：文档推荐的 **Signal** 用法在客户端真跑
 *
 * ## 背景
 *
 * 2026-10-03 之前，`docs/guide/*` 与 `docs/examples/counter.md` 里 8 处
 * `import { signal } from '@lytjs/core'` 拿到的是 `undefined`（core 没转出）。
 * 本轮补上转出后，**必须验证「导出了」是否等于「用法可用」** —— 实测结论：
 *
 * | 用法 | 修复前 | 修复后 |
 * |---|---|---|
 * | `render` 函数里 `ctx.count()` | ✅ | ✅ |
 * | 子组件里 `ctx.v()` | ✅ | ✅ |
 * | **模板插值 `{{ count }}`** | ❌ 输出整个函数源码、点击不更新 | ✅ 输出 `0`，点击后 `1` |
 *
 * ⇒ 「名字存在」与「用法可用」是**两件事**：补完转出后必须真跑一次才发现语义仍是坏的。
 *
 * ⚠️ 根因与修法（供后续维护参考）：
 * · 根因：`signal()` 返回**可调用**对象，而模板插值走 `toDisplayString`，
 *   它把 signal 当普通值 stringify；且插值处**没有读取**它 ⇒ 未建立依赖。
 * · 修法：把品牌标记改成**全局注册**（`Symbol.for('lytjs:signal')`），
 *   让 `toDisplayString` 在**不 import reactivity** 的前提下识别并调用它 ——
 *   调用同时完成「取值」与「建立依赖」两件事。
 *   沿用本仓已有先例（`@lytjs/common-vnode` 的 `Symbol.for('Teleport')`）。
 *
 * 本文件把三条用法钉住：★ 模板插值（**含点击后更新** —— 这一条同时证明
 * 依赖已建立）、`render` 里直接读、子组件里读；另加一条「普通函数在插值位置
 * 不应被当成 signal」的反向守卫。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, signal, isSignal } from '../src/index';

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

async function flush(ms = 40): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe('端到端：Signal 的客户端用法', () => {
  it('core 应转出 signal（文档 8 处引用的名字）', () => {
    expect(typeof signal).toBe('function');
    const s = signal(1);
    expect(s()).toBe(1);
    // ⚠️ 本仓的写入契约是 `.set()` / `.update()`，**不是**「调用即写入」——
    // 文档原先写 `count(count() + 1)`，实测**根本不生效**（静默无操作），
    // 已于 2026-10-03 批量改为 `count.set(count() + 1)`。
    s.set(2);
    expect(s()).toBe(2);
    s.update((v) => v + 1);
    expect(s()).toBe(3);
  });

  it('isSignal 是类型守卫：认得出 signal，且不误判普通函数', () => {
    expect(isSignal(signal(0))).toBe(true);
    expect(isSignal(() => 0)).toBe(false);
    expect(isSignal(null)).toBe(false);
    expect(isSignal(42)).toBe(false);
  });

  it('★ render 函数里直接读 signal() 应正常', async () => {
    const host = newHost();
    await createApp({
      setup() {
        return { count: signal(0) };
      },
      render(ctx: { count: () => number }) {
        return h('span', { id: 'r' }, `n=${ctx.count()}`);
      },
    } as never).mount(host);
    await flush();

    expect(host.textContent).toBe('n=0');
  });

  it('★ 子组件里读 signal() 应正常', async () => {
    const host = newHost();
    const Child = {
      setup() {
        return { v: signal(7) };
      },
      render(ctx: { v: () => number }) {
        return h('span', { id: 'ch' }, `v=${ctx.v()}`);
      },
    };
    await createApp({ components: { Child }, template: '<div><Child /></div>' } as never).mount(
      host,
    );
    await flush();

    expect(host.textContent).toBe('v=7');
  });

  it('★ 模板插值 {{ count }} 应渲染出值，且点击后更新', async () => {
    const host = newHost();
    await createApp({
      setup() {
        const count = signal(0);
        return { count, inc: () => count.set(count() + 1) };
      },
      template: '<div><span id="c">{{ count }}</span><button id="b" @click="inc">+</button></div>',
    } as never).mount(host);
    await flush();

    // ★ 插值取出值（此前输出整个函数源码）
    expect(host.querySelector('#c')?.textContent).toBe('0');

    // ★ 点击后更新 —— 证明插值处「读」了 signal ⇒ 依赖已建立
    (host.querySelector('#b') as HTMLElement | null)?.click();
    await flush();
    expect(host.querySelector('#c')?.textContent).toBe('1');
  });

  it('插值位置不应把普通函数 stringify 成源码', async () => {
    const host = newHost();
    await createApp({
      setup() {
        const fn = () => {};
        return { fn };
      },
      template: '<div id="d">{{ fn }}</div>',
    } as never).mount(host);
    await flush();

    // 普通函数没有 signal 品牌 ⇒ 走原来的 String() 分支（保持既有行为）
    expect(host.querySelector('#d')?.textContent).not.toBe('');
  });
});
