/**
 * Signal/Vapor 模式下 v-once / v-memo 的语义测试
 *
 * 修复前：这两条指令在 codegen 的 switch 里没有分支，被**静默丢弃** ——
 * 元素照常建立响应式 effect，"只渲染一次"与"依赖未变不重渲染"的语义完全丢失。
 */

import { describe, it, expect } from 'vitest';
import { compile as compileImpl } from '../src/index';

/** A04/D1：本文件断言优化版产物，故显式开启 optimizeSignal（断言未改动）。 */
const compile = (template: string, options: Parameters<typeof compileImpl>[1] = {}) =>
  compileImpl(template, { rendererMode: 'signal', optimizeSignal: true, ...options });

const signal = (t: string) => compile(t).code;

/** 校验生成片段是合法 JS（避免再出现箭头函数体缺大括号这类语法错误） */
function assertSyntaxOk(code: string, fragment: string): void {
  expect(() => {
    new Function('e', 'x', '_c', '_0', '_1', '_2', fragment);
  }).not.toThrow();
  expect(code).toContain(fragment.trim().slice(0, 8));
}

describe('Signal 模式 - v-once', () => {
  it('普通元素应建立响应式 effect', () => {
    expect(signal('<div>{{ msg }}</div>')).toContain('e(()=>x(_0,_c.msg));');
  });

  it('v-once 元素不应建立 effect（只渲染一次）', () => {
    const code = signal('<div v-once>{{ msg }}</div>');
    expect(code).toContain('x(_0,_c.msg);');
    expect(code).not.toContain('e(()=>x(_0,_c.msg)');
  });

  it('v-once 应沿元素树向下传递', () => {
    const code = signal('<div v-once><span>{{ msg }}</span></div>');
    expect(code).toContain('x(_1,_c.msg);');
    expect(code).not.toContain('e(()=>x(_1,_c.msg)');
  });

  it('v-once 产物应是合法 JS', () => {
    const code = signal('<div v-once>{{ msg }}</div>');
    const fragment = code.split('\n').find((l) => l.includes('x(_0')) ?? '';
    assertSyntaxOk(code, fragment);
  });
});

describe('Signal 模式 - v-memo', () => {
  it('应生成依赖数组守卫', () => {
    const code = signal('<div v-memo="[a, b]">{{ msg }}</div>');
    expect(code).toContain('_memo_0');
    expect(code).toContain('[_c.a, _c.b]');
    expect(code).toContain('some((v,i)=>v!==_d[i])');
  });

  it('守卫内的渲染不应再包一层 effect', () => {
    const code = signal('<div v-memo="[a]">{{ msg }}</div>');
    expect(code).toContain('_memo_0=_d;x(_0,_c.msg);');
    expect(code).not.toContain('e(()=>x(_0,_c.msg)');
  });

  it('v-memo 产物应是合法 JS（箭头体带大括号）', () => {
    const code = signal('<div v-memo="[a, b]">{{ msg }}</div>');
    const fragment = code.split('\n').find((l) => l.includes('_memo_0')) ?? '';
    assertSyntaxOk(code, fragment);
  });

  it('多个 v-memo 元素应使用不同的缓存变量名', () => {
    const code = signal('<div><i v-memo="[a]">{{ x }}</i><b v-memo="[b]">{{ y }}</b></div>');
    expect(code).toContain('_memo_0');
    expect(code).toContain('_memo_1');
  });
});

/**
 * B01b：v-memo 移植到**基础实现**（运行时 SignalRenderer 走的路径）。
 * 此前基础实现只在 v-once 上有处理，v-memo 被静默丢弃 —— 双 codegen 再次不同步。
 */
describe('Signal 模式 - 基础实现（optimizeSignal:false）的 v-memo', () => {
  const base = (t: string) =>
    compileImpl(t, { rendererMode: 'signal', optimizeSignal: false }).code;

  it('应生成依赖数组守卫，且守卫内不再包一层 effect', () => {
    const code = base('<div v-memo="[a, b]">{{ msg }}</div>');
    expect(code).toContain('let _memo_0=null;');
    expect(code).toContain('const _d=[_ctx.a, _ctx.b];');
    expect(code).toContain('some((v,i)=>v!==_d[i])');
    expect(code).toContain('_memo_0=_d;setText(_div, _ctx.msg);');
    // 逐绑定 effect 必须被去掉，否则内层 effect 仍独立触发，memo 失效
    expect(code).not.toContain('effect(() => setText(_div');
  });

  it('v-memo 应把整个子树的绑定收进守卫', () => {
    const code = base('<div v-memo="[a]"><span>{{ msg }}</span></div>');
    expect(code).toContain('const _d=[_ctx.a];');
    expect(code).toContain('_memo_0=_d;setText(_span, _ctx.msg);');
  });

  it('多个 v-memo 元素应使用不同的缓存变量名（基础实现）', () => {
    const code = base('<div><i v-memo="[a]">{{ x }}</i><b v-memo="[b]">{{ y }}</b></div>');
    expect(code).toContain('let _memo_0=null;');
    expect(code).toContain('let _memo_1=null;');
  });

  it('v-once 优先于 v-memo（与优化版一致）', () => {
    const code = base('<div v-once v-memo="[a]">{{ msg }}</div>');
    expect(code).not.toContain('_memo_');
    expect(code).toContain('setText(_div, _ctx.msg);');
    expect(code).not.toContain('effect(() => setText(_div');
  });
});
