// @vitest-environment jsdom
/**
 * Signal 模式的「生命周期钩子」与「上下文响应性」（P1-5 / P1-6 回归）
 *
 * ## 两条缺陷（2026-10-26 评估 §4 D4 / D5）
 *
 * - **P1-5**：`mountWithSignalMode` 直接调 `setup()`，**没有设置 `currentInstance`**。
 *   而 `onMounted` / `onBeforeMount` / `onUnmounted` 全靠 `currentInstance` 才能把回调
 *   登记进实例 ⇒ signal 模式下这些钩子**永不触发**（只有一条 DEV warn 提示
 *   "Make sure to call this function inside setup()" —— 而用户确实是在 setup 里调的）。
 *
 * - **P1-6**：`ctx` 是普通对象 `{ ...rootProps }`，`data()` 的返回值只是被
 *   `Object.assign` 拷进去 ⇒ 模板读到一次性快照，后续修改**不触发重渲染**。
 *
 * 两条都属于「不报错、只是不工作」，是最难被发现的那一类。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createApp } from '../src/create-app';
import { onMounted, onBeforeMount } from '@lytjs/component';

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  container.remove();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const signalApp = (component: Record<string, unknown>) =>
  createApp(component as never, null, { rendererMode: 'signal' } as never);

// ⚠️ 单例超时上调：本文件首个用例要付「动态 import @lytjs/renderer + 编译模板」的一次性成本，
// 在本机沙箱（fs broker 逐文件走 RPC）下实测 4~5s，紧贴 vitest 默认的 5s 上限 ⇒ 会偶发超时。
// 这不是被测代码慢，是**首次模块加载**慢；给足余量，避免把环境噪声当成回归。
describe('Signal 模式的生命周期钩子（P1-5 回归）', { timeout: 20_000 }, () => {
  it('setup 里注册的 onMounted 必须被调用', async () => {
    const order: string[] = [];

    const app = signalApp({
      template: '<div>hi</div>',
      setup() {
        order.push('setup');
        onBeforeMount(() => order.push('onBeforeMount'));
        onMounted(() => order.push('onMounted'));
        return {};
      },
    });

    await app.mount(container);

    expect(order).toEqual(['setup', 'onBeforeMount', 'onMounted']);
  });

  it('钩子的执行顺序是 beforeMount → 渲染 → mounted', async () => {
    let domAtMounted = '';

    const app = signalApp({
      template: '<div class="probe">hi</div>',
      setup() {
        onMounted(() => {
          domAtMounted = container.innerHTML;
        });
        return {};
      },
    });

    await app.mount(container);

    // onMounted 触发时 DOM 必须已经在容器里（否则说明钩子跑早了）
    expect(domAtMounted).toContain('probe');
  });

  it('setup 结束后 currentInstance 必须复位（不能泄漏到外部）', async () => {
    const app = signalApp({
      template: '<div>x</div>',
      setup() {
        return {};
      },
    });
    await app.mount(container);

    // 挂载之后再注册钩子应当落空（而不是挂到刚那个实例上）
    const spy = vi.fn();
    onMounted(spy);
    expect(spy).not.toHaveBeenCalled();
  });

  it('setup 抛错时也必须复位 currentInstance', async () => {
    const app = signalApp({
      template: '<div>x</div>',
      setup() {
        throw new Error('boom');
      },
    });

    await expect(app.mount(container)).rejects.toThrow(/boom/);

    const spy = vi.fn();
    onMounted(spy);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('Signal 模式的上下文响应性（P1-6 回归）', { timeout: 20_000 }, () => {
  it('data() 的值修改后 DOM 必须更新', async () => {
    const app = signalApp({
      template: '<div>{{ count }}</div>',
      data() {
        return { count: 1 };
      },
    });

    // ⚠️ 必须接住 mount() 的返回值 —— 它是**公共实例**（ctx 的代理）；
    //   而 `createApp()` 返回的是 App 对象，往 App 上写属性根本到不了 ctx
    //   （我第一次就写错了，读回来是 42 所以看起来「对」，DOM 却不变）。
    const instance = (await app.mount(container)) as unknown as Record<string, unknown>;
    expect(container.textContent).toContain('1');

    instance.count = 42;
    await new Promise((r) => setTimeout(r, 30));

    expect(container.textContent).toContain('42');
  });

  it('setup() 返回的普通值同样具有响应性', async () => {
    const app = signalApp({
      template: '<div>{{ msg }}</div>',
      setup() {
        return { msg: 'a' };
      },
    });

    const instance = (await app.mount(container)) as unknown as Record<string, unknown>;
    expect(container.textContent).toContain('a');

    instance.msg = 'b';
    await new Promise((r) => setTimeout(r, 30));

    expect(container.textContent).toContain('b');
  });
});
