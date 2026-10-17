// @vitest-environment jsdom
/**
 * 行为级判据：`vdom/transition.ts` 的**过渡生命周期**（enter / leave / 等待结束 / 下一帧）
 *
 * ## 为什么要有这条
 *
 * 同文件的 DOM 辅助函数（`getTransitionInfoDOM` / `addTransitionClass` / `hasCSSTransition` …）
 * 已由 `transition-dom-helpers.test.ts` 覆盖，但**真正的生命周期**——
 * `performEnterTransition` / `performLeaveTransition` / `waitForTransitionEndDOM` / `nextFrame`
 * ——**一条判据都没有**（约 310 行）。
 *
 * ## jsdom 的约束（决定判据怎么写）
 *
 * jsdom **没有 CSS 引擎** ⇒ 类名不会产生计算样式，`getComputedStyle` 只反映**内联样式**。
 * 因此：
 * - 「无过渡」路径（默认）是**同步**完成的 ⇒ 直接断言类名与钩子顺序；
 * - 「有过渡」路径用**内联** `transition-duration` 触发，配合假定时器推进
 *   （`duration + 50` 后才完成）。
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { WebRendererHost } from '@lytjs/adapter-web';
import {
  performEnterTransition,
  performLeaveTransition,
  waitForTransitionEndDOM,
  nextFrame,
} from '../src/transition';

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

const el = (): HTMLElement => {
  const e = document.createElement('div');
  document.body.appendChild(e);
  return e;
};

const has = (e: Element, cls: string): boolean => e.classList.contains(cls);

/** 记录钩子调用顺序 */
const order: string[] = [];
const push = (s: string) => () => void order.push(s);

// ==================== enter ====================

describe('performEnterTransition（DOM 回退）', () => {
  it('无过渡时同步完成：钩子顺序 before → after → done，且三个类名都被清掉', () => {
    const e = el();
    const done = vi.fn(() => order.push('done'));

    performEnterTransition(
      e,
      {
        onBeforeEnter: push('before'),
        onAfterEnter: push('after'),
      } as never,
      done,
    );

    expect(order).toEqual(['before', 'after', 'done']);
    expect(has(e, 'v-enter-from')).toBe(false);
    expect(has(e, 'v-enter-active')).toBe(false);
    expect(has(e, 'v-enter-to')).toBe(false);
  });

  it('onBeforeEnter 时元素尚未带任何过渡类名（钩子先于加类）', () => {
    const e = el();
    let snapshot: string[] = [];

    performEnterTransition(
      e,
      {
        onBeforeEnter: (target: Element) => {
          snapshot = Array.from(target.classList);
        },
      } as never,
      () => {},
    );

    expect(snapshot).toEqual([]);
  });

  it('自定义 name ⇒ 使用 `<name>-enter-*` 类名', () => {
    const e = el();
    let sawActive = false;

    performEnterTransition(
      e,
      {
        name: 'fade',
        onEnter: (target: Element, done: () => void) => {
          sawActive = has(target, 'fade-enter-active');
          done();
        },
      } as never,
      () => {},
    );

    expect(sawActive).toBe(true);
    expect(has(e, 'fade-enter-active')).toBe(false);
  });

  it('显式类名覆盖（enterFromClass / enterActiveClass / enterToClass）生效', () => {
    const e = el();
    let saw: string[] = [];

    performEnterTransition(
      e,
      {
        enterActiveClass: 'my-active',
        enterToClass: 'my-to',
        onEnter: (target: Element, done: () => void) => {
          saw = Array.from(target.classList);
          done();
        },
      } as never,
      () => {},
    );

    expect(saw).toContain('my-active');
    expect(saw).toContain('my-to');
  });

  it('onEnter 拿到元素与 done；调 done 后才清理并触发 onAfterEnter', () => {
    const e = el();
    let doneCb: (() => void) | null = null;
    const after = vi.fn();
    const outer = vi.fn();

    performEnterTransition(
      e,
      {
        onEnter: (_target: Element, cb: () => void) => {
          doneCb = cb;
        },
        onAfterEnter: after,
      } as never,
      outer,
    );

    // 用户尚未调 done ⇒ 过渡仍"进行中"
    expect(has(e, 'v-enter-active')).toBe(true);
    expect(has(e, 'v-enter-to')).toBe(true);
    expect(after).not.toHaveBeenCalled();
    expect(outer).not.toHaveBeenCalled();

    doneCb!();

    expect(has(e, 'v-enter-active')).toBe(false);
    expect(has(e, 'v-enter-to')).toBe(false);
    expect(after).toHaveBeenCalled();
    expect(outer).toHaveBeenCalled();
  });

  it('★ 有过渡时长时**不**同步完成；推进 duration+50 后才完成并清理', () => {
    vi.useFakeTimers();
    const e = el();
    e.style.setProperty('transition-duration', '0.3s');
    const done = vi.fn();
    const after = vi.fn();

    performEnterTransition(e, { onAfterEnter: after } as never, done);

    // 仍在过渡中
    expect(done).not.toHaveBeenCalled();
    expect(has(e, 'v-enter-active')).toBe(true);

    vi.advanceTimersByTime(300 + 50);

    expect(done).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledTimes(1);
    expect(has(e, 'v-enter-active')).toBe(false);
    expect(has(e, 'v-enter-to')).toBe(false);
  });
});

// ==================== leave ====================

describe('performLeaveTransition（DOM 回退）', () => {
  it('无过渡时同步完成：钩子顺序 before → after → done，且类名清理', () => {
    const e = el();
    order.length = 0;
    const done = vi.fn(() => order.push('done'));

    performLeaveTransition(
      e,
      {
        onBeforeLeave: push('before'),
        onAfterLeave: push('after'),
      } as never,
      done,
    );

    expect(order).toEqual(['before', 'after', 'done']);
    expect(has(e, 'v-leave-from')).toBe(false);
    expect(has(e, 'v-leave-active')).toBe(false);
    expect(has(e, 'v-leave-to')).toBe(false);
  });

  it('onLeave 拿到元素与 done；调 done 后清理并触发 onAfterLeave', () => {
    const e = el();
    let doneCb: (() => void) | null = null;
    const after = vi.fn();

    performLeaveTransition(
      e,
      {
        onLeave: (_target: Element, cb: () => void) => {
          doneCb = cb;
        },
        onAfterLeave: after,
      } as never,
      () => {},
    );

    expect(has(e, 'v-leave-active')).toBe(true);
    doneCb!();
    expect(has(e, 'v-leave-active')).toBe(false);
    expect(after).toHaveBeenCalled();
  });

  it('★ 有过渡时长时不立即完成；推进后完成', () => {
    vi.useFakeTimers();
    const e = el();
    e.style.setProperty('transition-duration', '0.2s');
    const done = vi.fn();

    performLeaveTransition(e, {} as never, done);
    expect(done).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200 + 50);
    expect(done).toHaveBeenCalledTimes(1);
  });
});

// ==================== waitForTransitionEndDOM ====================

const info = (
  over: Partial<{ duration: number; hasTransition: boolean; hasAnimation: boolean }> = {},
) => ({
  duration: 0,
  hasTransition: true,
  hasAnimation: false,
  ...over,
});

const dispatch = (target: Element, type: string, props: Record<string, unknown> = {}): void => {
  const ev = new Event(type, { bubbles: true });
  Object.entries(props).forEach(([k, v]) => Object.defineProperty(ev, k, { value: v }));
  target.dispatchEvent(ev);
};

describe('waitForTransitionEndDOM', () => {
  it('transitionend 触发完成；重复触发只完成一次', () => {
    const e = el();
    const done = vi.fn();

    waitForTransitionEndDOM(e, info(), done);
    dispatch(e, 'transitionend');
    expect(done).toHaveBeenCalledTimes(1);

    dispatch(e, 'transitionend');
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('★ 子元素冒泡上来的 transitionend 应被忽略（只看自身）', () => {
    const e = el();
    const child = document.createElement('span');
    e.appendChild(child);
    const done = vi.fn();

    waitForTransitionEndDOM(e, info(), done);
    dispatch(child, 'transitionend');

    expect(done).not.toHaveBeenCalled();

    dispatch(e, 'transitionend');
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('多个 animation 时须**全部** animationend 才完成', () => {
    const e = el();
    e.style.setProperty('animation-name', 'a, b');
    const done = vi.fn();

    waitForTransitionEndDOM(e, info({ hasTransition: false, hasAnimation: true }), done);

    dispatch(e, 'animationend', { animationName: 'a' });
    expect(done).not.toHaveBeenCalled();

    dispatch(e, 'animationend', { animationName: 'b' });
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('duration=0 时用 3s 兜底（不会永久挂起）', () => {
    vi.useFakeTimers();
    const e = el();
    const done = vi.fn();

    waitForTransitionEndDOM(e, info({ duration: 0 }), done);
    expect(done).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3000);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('duration>0 时兜底为 duration+50', () => {
    vi.useFakeTimers();
    const e = el();
    const done = vi.fn();

    waitForTransitionEndDOM(e, info({ duration: 200 }), done);

    vi.advanceTimersByTime(200);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('★ 完成后应移除监听（后续事件不再重复触发 done）', () => {
    const e = el();
    const done = vi.fn();

    waitForTransitionEndDOM(e, info(), done);
    dispatch(e, 'transitionend');
    dispatch(e, 'animationend', { animationName: 'x' });
    dispatch(e, 'transitionend');

    expect(done).toHaveBeenCalledTimes(1);
  });
});

// ==================== nextFrame ====================

describe('nextFrame', () => {
  it('回调在下一帧（双 rAF）之后被调用', async () => {
    const fn = vi.fn();
    nextFrame(fn);

    expect(fn).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 120));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('传 host 时通过 host.nextFrame 执行（平台无关）', () => {
    const nextFrameSpy = vi.fn();
    const host = { __isRendererHost: true, nextFrame: nextFrameSpy } as never;

    nextFrame(host, () => {});

    expect(nextFrameSpy).toHaveBeenCalledTimes(1);
  });
});

// ==================== 泛型 host 分支（真实渲染器走这条） ====================

describe('performEnterTransition / performLeaveTransition（host 分支）', () => {
  // ⚠️ DOM 回退与泛型分支是**两套并行实现**（内联逻辑 vs `TransitionEngine`），
  //    只测其中一套会漏掉另一套。这里用真实 `WebRendererHost` 覆盖泛型分支。
  const makeHost = () => new WebRendererHost();

  it('无过渡时同步完成，钩子顺序与类名清理与 DOM 回退一致', () => {
    const host = makeHost();
    const e = el();
    order.length = 0;
    const done = vi.fn(() => order.push('done'));

    performEnterTransition(
      host,
      e,
      { onBeforeEnter: push('before'), onAfterEnter: push('after') } as never,
      done,
    );

    expect(order).toEqual(['before', 'after', 'done']);
    expect(has(e, 'v-enter-from')).toBe(false);
    expect(has(e, 'v-enter-active')).toBe(false);
    expect(has(e, 'v-enter-to')).toBe(false);
  });

  it('onEnter 钩子拿到元素与 done；调 done 后清理', () => {
    const host = makeHost();
    const e = el();
    let doneCb: (() => void) | null = null;

    performEnterTransition(
      host,
      e,
      {
        onEnter: (_target: Element, cb: () => void) => {
          doneCb = cb;
        },
      } as never,
      () => {},
    );

    expect(has(e, 'v-enter-active')).toBe(true);
    doneCb!();
    expect(has(e, 'v-enter-active')).toBe(false);
    expect(has(e, 'v-enter-to')).toBe(false);
  });

  it('leave：无过渡时同步完成并清理类名', () => {
    const host = makeHost();
    const e = el();
    const done = vi.fn();

    performLeaveTransition(host, e, {} as never, done);

    expect(done).toHaveBeenCalledTimes(1);
    expect(has(e, 'v-leave-from')).toBe(false);
    expect(has(e, 'v-leave-active')).toBe(false);
    expect(has(e, 'v-leave-to')).toBe(false);
  });
});
