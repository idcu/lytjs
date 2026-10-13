/**
 * js-framework-benchmark style benchmark —— jsdom 可承载子集
 *
 * ⚠️ 范围与修复说明（2026-10-11）
 *
 * 本套件此前**产不出任何数字**，根因与处置：
 * 1. vitest 的 `bench()` **不执行** `beforeEach`/`afterEach` 钩子 ⇒ 原先靠
 *    `beforeEach` 赋值的 `container` 恒为 `undefined`，`app.mount(container)`
 *    抛「cannot find element matching selector "undefined"」。
 * 2. **DOM 挂载型场景在 jsdom 下不可靠**：挂载真实 DOM 树 × 按时间多迭代，
 *    实测反复出错并最终把堆撑爆（OOM）；且本 vitest 版本的
 *    `bench(name, fn, options)` **忽略**第三参（设 `iterations:20` 实跑 149 样本）
 *    ⇒ 无法用迭代上限兜底。故**不在 jsdom 内伪造** create/update/select/delete
 *    rows 等 DOM 场景。
 * 3. 官方 js-framework-benchmark 本就在**真浏览器**测真实 DOM；本仓浏览器接入件见
 *    `js-framework-benchmark/frameworks/`（`lytjs` / `lytjs-npm-vdom` / `lytjs-npm-vapor`）。
 *    真正的 DOM 渲染数字请以浏览器 harness 为准。
 *
 * 本文件只保留 jsdom 下**稳定可测**的场景：响应式原语吞吐 + 组件实例创建/销毁。
 * DOM 列表渲染/更新数字另见 `vapor-list.bench.ts` / `modes-comparison.bench.ts`。
 */

import { describe, bench } from 'vitest';
import { h, createApp, computed, signal, effect } from '@lytjs/core';

describe('js-framework-benchmark (jsdom 子集：响应式原语 + 组件)', () => {
  bench('signal updates - 1000', () => {
    const s = signal(0);
    for (let i = 0; i < 1000; i++) s.value = i;
    return s.value;
  });

  bench('computed updates - 1000', () => {
    const s = signal(0);
    const c = computed(() => s.value * 2);
    for (let i = 0; i < 1000; i++) {
      s.value = i;
      const _val = c.value;
    }
    return c.value;
  });

  bench('effect runs - 1000', () => {
    const s = signal(0);
    let count = 0;
    const _cleanup = effect(() => {
      const _val = s.value;
      count++;
    });
    for (let i = 0; i < 1000; i++) s.value = i;
    return count;
  });

  bench('create and destroy 1000 components', () => {
    for (let i = 0; i < 1000; i++) {
      const Component = {
        setup() {
          return { data: signal(i) };
        },
        render() {
          return h('div', {}, `${this.data}`);
        },
      };
      const _app = createApp(Component);
      // No mount - just creation
    }
    return true;
  });
});
