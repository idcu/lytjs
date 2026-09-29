/**
 * dom-runtime 在**非浏览器环境**（无 `document` / `HTMLElement`）下的降级路径。
 *
 * 动机：`src/index.ts` 里几乎每个 DOM 操作都有 `if (!isBrowser) return …` 守卫，
 * 而现有测试是 jsdom 环境（`isBrowser === true`）⇒ 守卫的**真分支从未执行**，
 * 这正是分支覆盖率的主要缺口。
 *
 * 姿势说明：`isBrowser` 在**模块求值时**一次性计算。测试环境无法简单降到 node
 * （vitest 仍按配置/就近规则走 jsdom），故改为：
 * ① `vi.stubGlobal` 抹掉 `document` / `HTMLElement`；② `vi.resetModules()` 丢弃已求值模块；
 * ③ **动态 import** 得到一个 `isBrowser === false` 的全新模块实例。
 * ⚠️ 因此本文件**不能**在顶部静态 import 被测模块（那会在 stub 之前就求值）。
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

type Dr = typeof import('../src/index');
type Loose = (...args: any[]) => any;

let dr: Dr;

beforeAll(async () => {
  // 根配置默认 `environment: 'node'` ⇒ 正常情况下本文件**本来**就没有 document，
  // `isBrowser` 天然为 false，无需任何处理（也避免因重置模块而让覆盖率重复计数）。
  // 仅当环境确实是浏览器（如单独用包内 jsdom 配置跑）时才需要抹掉 globals 并重新求值。
  if (typeof (globalThis as any).document !== 'undefined') {
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('HTMLElement', undefined);
    vi.resetModules();
  }
  dr = await import('../src/index');
});

describe('dom-runtime · 非浏览器环境降级（isBrowser = false）', () => {
  it('前置断言：模块确实在「非浏览器」下求值（createElement 返回空对象壳）', () => {
    expect((dr.createElement as Loose)('div')).toEqual({});
    expect((dr.createTextNode as Loose)('x')).toEqual({});
  });

  it('claimTextSlots / createTemplate 安全降级', () => {
    expect(dr.claimTextSlots({})).toEqual([]);
    expect(dr.createTemplate('<div></div>')).toBeTruthy();
  });

  it('insert / remove / clearChildren / setHTML 为 no-op（不抛错）', () => {
    expect(() => (dr.insert as Loose)({}, {})).not.toThrow();
    expect(() => (dr.remove as Loose)({})).not.toThrow();
    expect(() => (dr.clearChildren as Loose)({})).not.toThrow();
    expect(() => (dr.setHTML as Loose)({}, '<b>x</b>')).not.toThrow();
  });

  it('setText / setAttribute / removeAttribute / setProperty / setStyle / setClass / toggleClass 为 no-op', () => {
    expect(() => (dr.setText as Loose)({}, 'v')).not.toThrow();
    expect(() => (dr.setAttribute as Loose)({}, 'id', 'x')).not.toThrow();
    expect(() => (dr.removeAttribute as Loose)({}, 'id')).not.toThrow();
    expect(() => (dr.setProperty as Loose)({}, 'value', 1)).not.toThrow();
    expect(() => (dr.setStyle as Loose)({}, { color: 'red' })).not.toThrow();
    expect(() => (dr.setClass as Loose)({}, 'a b')).not.toThrow();
    expect(() => (dr.toggleClass as Loose)({}, 'a', true)).not.toThrow();
  });

  it('事件相关 API 返回「空取消函数」而非抛错', () => {
    const off1 = (dr.addEventListener as Loose)({}, 'click', () => {});
    expect(typeof off1).toBe('function');
    expect(() => off1()).not.toThrow();

    const off2 = (dr.createEventHandler as Loose)({}, 'click', () => {});
    expect(typeof off2).toBe('function');
    expect(() => off2()).not.toThrow();

    const off3 = (dr.addEventListenerDelegate as Loose)({}, 'click', () => {});
    expect(typeof off3).toBe('function');
    expect(() => off3()).not.toThrow();

    expect(() => (dr.removeEventListenerDelegate as Loose)({}, 'click', () => {})).not.toThrow();
    expect(() => (dr.cleanupElementDelegates as Loose)({})).not.toThrow();
  });

  it('reconcileArray / flushSyncDOM 为 no-op', () => {
    expect(() => (dr.reconcileArray as Loose)({}, [], {})).not.toThrow();
    expect(() => dr.flushSyncDOM()).not.toThrow();
  });

  it('batchDOM 在非浏览器下**直接同步执行**回调（不排队）', () => {
    let ran = 0;
    dr.batchDOM(() => {
      ran += 1;
    });
    expect(ran).toBe(1);
  });
});
