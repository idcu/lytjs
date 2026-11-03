/**
 * @lytjs/common-transition-engine 生命周期回归（2026-11-03）
 *
 * 覆盖 4 个「类名/回调看起来都对、但元素状态没收干净」的缺陷：
 * ① 用户钩子抛错阻断 `done()` ⇒ 元素永不移除；
 * ② 取消过渡不清类名 ⇒ 元素永久带 `-active`；
 * ③ 时长为 0 的过渡等满 5 秒超时；
 * ④ `dispose()` 不撤定时器/监听。
 *
 * 对应门禁：`scripts/check-transition-engine.mjs`（48 条断言）。
 */
import { describe, it, expect } from 'vitest';
import { TransitionEngine } from '../src';

function createHost(info = { duration: 300, hasTransition: true, hasAnimation: false }) {
  const timers = new Map();
  const listeners = new Map();
  let seq = 0;

  const host: any = {
    addClass: (el: any, cls: string) => el.classes.add(cls),
    removeClass: (el: any, cls: string) => el.classes.delete(cls),
    hasClass: (el: any, cls: string) => el.classes.has(cls),
    setStyle: () => {},
    removeStyle: () => {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    forceReflow: () => {},
    addEventListener: (_el: any, type: string, fn: any) => {
      listeners.set(type, fn);
      return () => listeners.delete(type);
    },
    removeEventListener: () => {},
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: 10,
      height: 10,
      right: 10,
      bottom: 10,
    }),
    getAttribute: () => null,
    getTransitionInfo: () => info,
    nextFrame: (fn: any) => setTimeout(fn, 0),
    setTimeout: (fn: any, ms: number) => {
      const id = ++seq;
      timers.set(id, { fn, ms });
      return id;
    },
    clearTimeout: (id: number) => timers.delete(id),
    getNamespaceURI: () => null,
    replaceChild: () => {},
    getChildNodes: () => [],
    getNodeType: () => 1,
    getTagName: () => 'div',
    createElement: () => ({ classes: new Set() }),
    createText: () => ({}),
    createComment: () => ({}),
    setElementText: () => {},
    setText: () => {},
    insert: () => {},
    remove: () => {},
    nextSibling: () => null,
    parentNode: () => null,
    querySelector: () => null,
    patchProp: () => {},
  };

  host.newEl = () => ({ classes: new Set<string>() });
  host.pendingTimers = () => [...timers.values()].map((t: any) => t.ms);
  host.runTimers = () => {
    const entries = [...timers.values()];
    timers.clear();
    for (const t of entries as any[]) t.fn();
  };
  host.fire = (type: string, target: any) => {
    const fn = listeners.get(type);
    if (fn) fn({ type, target });
  };
  host.hasListener = (type: string) => listeners.has(type);
  return host;
}

describe('TransitionEngine 生命周期', () => {
  it('用户钩子抛错不阻断 done 与状态收敛', () => {
    const host = createHost();
    const engine = new TransitionEngine(host);
    const el = host.newEl();
    let doneCount = 0;

    engine.performEnter(
      el,
      {
        onAfterEnter: () => {
          throw new Error('boom');
        },
      },
      () => doneCount++,
    );
    host.fire('transitionend', el);

    expect(doneCount).toBe(1);
    expect(engine.getState(el).phase).toBe('idle');
    expect([...el.classes]).toEqual([]);
  });

  it('取消过渡后清空过渡类名', () => {
    const host = createHost();
    const engine = new TransitionEngine(host);
    const el = host.newEl();

    engine.performEnter(el, {}, () => {});
    expect([...el.classes]).toContain('v-enter-active');

    engine.cancelTransition(el);
    expect([...el.classes]).toEqual([]);
    expect(engine.getState(el).phase).toBe('idle');
  });

  it('取消不调用 done（元素不因此被移除），但会调取消钩子', () => {
    const host = createHost();
    const engine = new TransitionEngine(host);
    const el = host.newEl();
    const cancelled: string[] = [];
    let doneCount = 0;

    engine.performLeave(el, { onLeaveCancelled: () => cancelled.push('leave') }, () => doneCount++);
    engine.cancelTransition(el);

    expect(doneCount).toBe(0);
    expect(cancelled).toEqual(['leave']);
  });

  it('时长为 0 的过渡立即完成，不挂 5 秒超时', () => {
    const host = createHost({ duration: 0, hasTransition: true, hasAnimation: false });
    const engine = new TransitionEngine(host);
    const el = host.newEl();
    let doneCount = 0;

    engine.performLeave(el, {}, () => doneCount++);

    expect(doneCount).toBe(1);
    expect(host.pendingTimers()).toEqual([]);
  });

  it('无事件时按 duration + 50ms 兜底收敛', () => {
    const host = createHost({ duration: 200, hasTransition: true, hasAnimation: false });
    const engine = new TransitionEngine(host);
    const el = host.newEl();
    let doneCount = 0;

    engine.performEnter(el, {}, () => doneCount++);
    expect(host.pendingTimers()).toEqual([250]);

    host.runTimers();
    expect(doneCount).toBe(1);
  });

  it('子元素冒泡的 transitionend 不结束父元素的过渡', () => {
    const host = createHost();
    const engine = new TransitionEngine(host);
    const el = host.newEl();
    const child = host.newEl();
    let doneCount = 0;

    engine.performEnter(el, {}, () => doneCount++);
    host.fire('transitionend', child);
    expect(doneCount).toBe(0);

    host.fire('transitionend', el);
    expect(doneCount).toBe(1);
  });

  it('收敛后释放 props 引用', () => {
    const host = createHost();
    const engine = new TransitionEngine(host);
    const el = host.newEl();

    engine.performEnter(el, { name: 'x' }, () => {});
    expect(engine.getState(el).props).toBeDefined();

    host.fire('transitionend', el);
    expect(engine.getState(el).props).toBeUndefined();
  });

  it('dispose 撤掉定时器与监听', () => {
    const host = createHost();
    const engine = new TransitionEngine(host);
    const el = host.newEl();
    let doneCount = 0;

    engine.performEnter(el, {}, () => doneCount++);
    expect(host.pendingTimers().length).toBe(1);

    engine.dispose();
    expect(host.pendingTimers()).toEqual([]);
    expect(host.hasListener('transitionend')).toBe(false);

    host.runTimers();
    expect(doneCount).toBe(0);
  });

  it('重复事件不重复回调（幂等）', () => {
    const host = createHost();
    const engine = new TransitionEngine(host);
    const el = host.newEl();
    const after: number[] = [];

    engine.performEnter(el, { onAfterEnter: () => after.push(1) }, () => {});
    host.fire('transitionend', el);
    host.fire('transitionend', el);

    expect(after).toHaveLength(1);
  });
});
