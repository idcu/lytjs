// @vitest-environment jsdom
/**
 * Signal 渲染器 · 事件处理器语义（真实点击，不是形状断言）
 *
 * ⚠️ 回归背景（2026-09-30 修复）：`@click="fn()"`（**内联语句**）此前被直接当成 handler
 * 表达式：`createEventHandler(el, 'click', _c.fn())` —— 于是
 *   ① `fn()` 在 **setup 阶段就被调用**（应等点击时才调用）；
 *   ② 传入的是 `fn()` 的**返回值**（通常 `undefined`）⇒ 点击时 `handler(e)` 直接
 *      `TypeError: handler is not a function`。
 * `@click="fn"`（**方法引用**）则应原样传引用（点击时才调用）。
 *
 * 本文件用**真实渲染 + 真实点击**做判据（`createSignalRenderer` 走非优化版 codegen；
 * 优化版的同一语义由 `compiler/tests/signal-expression-policy.test.ts` 的双写门禁覆盖）。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSignalRenderer } from '../src/signal/signal-renderer';
import { compile } from '@lytjs/compiler';
import { mountSignal } from './helpers/run-signal-code';

describe('SignalRenderer · @click 语义', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('方法引用 `@click="fn"`：setup 不调用，点击才调用', () => {
    let calls = 0;
    const renderer = createSignalRenderer('<button @click="fn">x</button>', {
      fn: () => {
        calls++;
      },
    });

    renderer.render(container);
    expect(calls).toBe(0); // setup 阶段不得调用

    container.querySelector('button')!.click();
    expect(calls).toBe(1);
    container.querySelector('button')!.click();
    expect(calls).toBe(2);

    renderer.unmount();
  });

  it('内联语句 `@click="fn()"`：setup 不调用，点击调用且**不抛错**', () => {
    let calls = 0;
    const renderer = createSignalRenderer('<button @click="fn()">x</button>', {
      fn: () => {
        calls++;
      },
    });

    renderer.render(container);
    expect(calls).toBe(0); // ← 修复前这里已是 1（setup 阶段被提前调用）

    expect(() => container.querySelector('button')!.click()).not.toThrow(); // ← 修复前 TypeError
    expect(calls).toBe(1);

    renderer.unmount();
  });

  it('内联语句带实参 `@click="fn(1, $event)"`：点击时求值', () => {
    const seen: unknown[] = [];
    const renderer = createSignalRenderer('<button @click="fn(1, $event)">x</button>', {
      fn: (...args: unknown[]) => {
        seen.push(args);
      },
    });

    renderer.render(container);
    expect(seen).toHaveLength(0);

    container.querySelector('button')!.click();
    expect(seen).toHaveLength(1);
    expect(seen[0]![0]).toBe(1);
    expect(seen[0]![1]).toBeInstanceOf(Event); // $event 即原生事件对象

    renderer.unmount();
  });

  it('内联自增 `@click="count++"`：每次点击加一', () => {
    const ctx = { count: 0 };
    const renderer = createSignalRenderer('<button @click="count++">x</button>', ctx);

    renderer.render(container);
    expect(ctx.count).toBe(0);

    container.querySelector('button')!.click();
    container.querySelector('button')!.click();
    expect(ctx.count).toBe(2);

    renderer.unmount();
  });
});

/**
 * 优化版 codegen（`optimizeSignal: true`，**默认路径**）——直接**执行产物**再断言，
 * 不依赖「产物含某字符串」这类形状断言。
 */
describe('优化版 codegen · @click 语义（真跑产物）', () => {
  const optCode = (tpl: string) =>
    compile(tpl, { rendererMode: 'signal', optimizeSignal: true } as never).code;

  it('方法引用 `@click="fn"`：setup 不调用，点击才调用', () => {
    let calls = 0;
    const { container } = mountSignal(optCode('<button @click="fn">x</button>'), {
      fn: () => {
        calls++;
      },
    });
    expect(calls).toBe(0);
    container.querySelector('button')!.click();
    expect(calls).toBe(1);
  });

  it('内联语句 `@click="fn()"`：setup 不调用、点击调用且不抛错', () => {
    let calls = 0;
    const { container } = mountSignal(optCode('<button @click="fn()">x</button>'), {
      fn: () => {
        calls++;
      },
    });
    expect(calls).toBe(0);
    expect(() => container.querySelector('button')!.click()).not.toThrow();
    expect(calls).toBe(1);
  });

  it('内联自增 `@click="count++"`：每次点击加一', () => {
    const ctx = { count: 0 };
    const { container } = mountSignal(optCode('<button @click="count++">x</button>'), ctx);
    expect(ctx.count).toBe(0);
    container.querySelector('button')!.click();
    container.querySelector('button')!.click();
    expect(ctx.count).toBe(2);
  });

  it('修饰符 + 内联语句：`.prevent` 生效且处理器仍被调用', () => {
    let calls = 0;
    const { container } = mountSignal(optCode('<button @click.prevent="fn()">x</button>'), {
      fn: () => {
        calls++;
      },
    });
    expect(calls).toBe(0);
    const evt = new MouseEvent('click', { cancelable: true, bubbles: true });
    container.querySelector('button')!.dispatchEvent(evt);
    expect(calls).toBe(1);
    expect(evt.defaultPrevented).toBe(true);
  });

  it('对照：`{{ a + b }}` 复杂插值真的渲染出文本（此前会被静默丢弃）', () => {
    const { container } = mountSignal(optCode('<div>{{ a + b }}</div>'), { a: 1, b: 2 });
    expect(container.innerHTML).toContain('3');
  });
});
