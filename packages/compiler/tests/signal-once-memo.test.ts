// @vitest-environment jsdom
/**
 * Signal/Vapor 模式下 v-once / v-memo 的语义测试
 *
 * 修复前：这两条指令在 codegen 的 switch 里没有分支，被**静默丢弃** ——
 * 元素照常建立响应式 effect，"只渲染一次"与"依赖未变不重渲染"的语义完全丢失。
 *
 * 断言方式：用 reactive 上下文执行产物，通过「改状态后 DOM 是否跟随」区分语义，
 * 而不是检查产物里的 `e(` / `_memo_0` 文本。
 */

import { describe, it, expect } from 'vitest';
import { reactive } from '@lytjs/reactivity';
import { compile as compileImpl } from '../src/index';
import { executeSignal } from './support/execute';

/** A04/D1：本文件断言优化版产物，故显式开启 optimizeSignal（断言未改动）。 */
const compile = (template: string, options: Parameters<typeof compileImpl>[1] = {}) =>
  compileImpl(template, { rendererMode: 'signal', optimizeSignal: true, ...options });

const mount = (template: string, ctx: Record<string, unknown> = {}) =>
  executeSignal(compile(template), ctx);

describe('Signal 模式 - v-once', () => {
  it('普通元素应建立响应式 effect', () => {
    const state = reactive({ msg: 'A' });
    const handle = mount('<div>{{ msg }}</div>', state);
    expect(handle.text()).toBe('A');
    state.msg = 'B';
    expect(handle.text()).toBe('B');
  });

  it('v-once 元素不应建立 effect（只渲染一次）', () => {
    const state = reactive({ msg: 'A' });
    const handle = mount('<div v-once>{{ msg }}</div>', state);
    expect(handle.text()).toBe('A');
    state.msg = 'B';
    expect(handle.text()).toBe('A');
  });

  it('v-once 应沿元素树向下传递', () => {
    const state = reactive({ msg: 'A' });
    const handle = mount('<div v-once><span>{{ msg }}</span></div>', state);
    expect(handle.text()).toBe('A');
    state.msg = 'B';
    expect(handle.text()).toBe('A');
  });

  it('v-once 产物应是合法 JS', () => {
    const state = reactive({ msg: 'A' });
    // 能执行且渲染出内容，即证明产物语法/引用合法（含箭头函数体大括号）
    expect(mount('<div v-once>{{ msg }}</div>', state).text()).toBe('A');
  });
});

describe('Signal 模式 - v-memo', () => {
  it('应生成依赖数组守卫', () => {
    const state = reactive({ a: 1, msg: 'A' });
    const handle = mount('<div v-memo="[a]">{{ msg }}</div>', state);
    expect(handle.text()).toBe('A');

    // 依赖未变：不重渲染
    state.msg = 'B';
    expect(handle.text()).toBe('A');

    // 依赖变化：用最新状态重渲染
    state.a = 2;
    expect(handle.text()).toBe('B');
  });

  it('守卫内的渲染不应再包一层 effect', () => {
    const state = reactive({ a: 1, msg: 'A' });
    const handle = mount('<div v-memo="[a]">{{ msg }}</div>', state);
    state.msg = 'B';
    // 若守卫内又套了独立 effect，msg 变化会绕过 memo 直接改 DOM
    expect(handle.text()).toBe('A');
  });

  it('v-memo 产物应是合法 JS（箭头体带大括号）', () => {
    const state = reactive({ a: 1, b: 2, msg: 'A' });
    expect(mount('<div v-memo="[a, b]">{{ msg }}</div>', state).text()).toBe('A');
  });

  it('多个 v-memo 元素应使用不同的缓存变量名', () => {
    const state = reactive({ a: 1, b: 1, x: 'X', y: 'Y' });
    const handle = mount(
      '<div><i v-memo="[a]">{{ x }}</i><b v-memo="[b]">{{ y }}</b></div>',
      state,
    );
    expect(handle.text()).toBe('XY');

    // 只改数值不改依赖：两个元素都保持缓存
    state.x = 'X2';
    state.y = 'Y2';
    expect(handle.text()).toBe('XY');

    // 只改第二个元素的依赖：只有它用最新值重渲染
    state.b = 2;
    expect(handle.text()).toBe('XY2');
  });
});

/**
 * B01b：v-memo 移植到**基础实现**（运行时 SignalRenderer 走的路径）。
 * 此前基础实现只在 v-once 上有处理，v-memo 被静默丢弃 —— 双 codegen 再次不同步。
 */
describe('Signal 模式 - 基础实现（optimizeSignal:false）的 v-memo', () => {
  const mountBase = (template: string, ctx: Record<string, unknown> = {}) =>
    executeSignal(compileImpl(template, { rendererMode: 'signal', optimizeSignal: false }), ctx);

  it('应生成依赖数组守卫，且守卫内不再包一层 effect', () => {
    const state = reactive({ a: 1, b: 2, msg: 'A' });
    const handle = mountBase('<div v-memo="[a, b]">{{ msg }}</div>', state);
    expect(handle.text()).toBe('A');

    state.msg = 'B';
    expect(handle.text()).toBe('A');

    state.a = 2;
    expect(handle.text()).toBe('B');
  });

  it('v-memo 应把整个子树的绑定收进守卫', () => {
    const state = reactive({ a: 1, msg: 'A' });
    const handle = mountBase('<div v-memo="[a]"><span>{{ msg }}</span></div>', state);
    expect(handle.text()).toBe('A');
    state.msg = 'B';
    expect(handle.text()).toBe('A');
    state.a = 2;
    expect(handle.text()).toBe('B');
  });

  it('多个 v-memo 元素应使用不同的缓存变量名（基础实现）', () => {
    const state = reactive({ a: 1, b: 1, x: 'X', y: 'Y' });
    const handle = mountBase(
      '<div><i v-memo="[a]">{{ x }}</i><b v-memo="[b]">{{ y }}</b></div>',
      state,
    );
    expect(handle.text()).toBe('XY');
    state.x = 'X2';
    state.y = 'Y2';
    expect(handle.text()).toBe('XY');
    state.b = 2;
    expect(handle.text()).toBe('XY2');
  });

  it('v-once 优先于 v-memo（与优化版一致）', () => {
    const state = reactive({ a: 1, msg: 'A' });
    const handle = mountBase('<div v-once v-memo="[a]">{{ msg }}</div>', state);
    expect(handle.text()).toBe('A');
    state.msg = 'B';
    expect(handle.text()).toBe('A');
  });
});
