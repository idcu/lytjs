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
 * | 用法 | 实测 |
 * |---|---|
 * | `render` 函数里 `ctx.count()` | ✅ 正常（`n=0`） |
 * | 子组件里 `ctx.v()` | ✅ 正常（`v=7`） |
 * | **模板插值 `{{ count }}`（count 是 WritableSignal）** | ❌ **渲染出整个函数源码**，且点击后不更新 |
 *
 * ⇒ **名字能解析了，语义仍然是坏的**。这是比「名字不存在」更隐蔽的一层：
 * 门禁只能证明「名字存在」，证明不了「用法可用」。
 *
 * ⚠️ 根因（供后续修复参考）：`signal()` 返回**可调用**对象，而模板插值走
 * `toDisplayString`，它把 signal 当普通值 stringify ⇒ 输出函数源码；
 * 且插值处**没有读取 signal** ⇒ 未建立依赖 ⇒ 更新也不触发。
 * 品牌标记 `SignalSymbol` 是 `Symbol(...)`（**非 `Symbol.for`**）⇒ vdom
 * 无法跨包识别；而 Vue 的做法是让插值编译成 `unref(...)`（本仓三套 codegen
 * 都还没走这一步）。
 *
 * 本文件把三条实测行为钉住：两条正常的当回归守卫，那条坏的**断言现状**
 * （修好时它会红 ⇒ 提醒同步文档与判据）。
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

  it('已知缺口：模板插值 {{ count }} 目前输出函数源码（修好时此用例会红）', async () => {
    const host = newHost();
    await createApp({
      setup() {
        const count = signal(0);
        return { count, inc: () => count.set(count() + 1) };
      },
      template: '<div><span id="c">{{ count }}</span><button id="b" @click="inc">+</button></div>',
    } as never).mount(host);
    await flush();

    // 实测：插值把可调用的 signal 当普通值 stringify ⇒ 输出函数源码
    expect(host.querySelector('#c')?.textContent).toContain('function');

    // 点击后依然不变（插值处没读 signal ⇒ 未建立依赖）
    (host.querySelector('#b') as HTMLElement | null)?.click();
    await flush();
    expect(host.querySelector('#c')?.textContent).toContain('function');
  });
});
