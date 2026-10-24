// @vitest-environment jsdom
/**
 * transition-group 的 **enter/leave 过渡等待** 与 **DOM / RendererHost 两条路径的一致性**。
 *
 * 背景：本文件的两组重载（`Element` 直传 vs `RendererHost`）是**两份平行实现**：
 * - leave 的 DOM 版修过「不等过渡结束就移除元素」（P1-13）；
 * - 但 **enter 的 DOM 版没跟着修**，`onBeforeEnter` / `onBeforeLeave` 与自定义类名
 *   也只在泛型版里有。
 *
 * 既有 `transition-group.test.ts` 覆盖的是「无 CSS 过渡」的立即完成路径
 * （jsdom 默认 `transition-duration` 为空 ⇒ `hasTransition === false`），
 * 所以「有过渡时到底等不等」从来没被验证过。本文件用 `getComputedStyle` 桩
 * 把 `hasTransition` 打开，并逐条比对两条路径。
 *
 * 语义约定（与实现一致，判据按此写）：
 * - `duration > 0` ⇒ 走**定时器**（`duration + 50`），transitionend 不再提前结束；
 * - `duration === 0` 但有过渡/动画 ⇒ 走**事件监听**（`waitForTransitionEndDOM` / host 事件）；
 *   注意 DOM 路径的 `getTransitionInfoDOM` 会把 delay 计入 duration
 *   ⇒ 该分支对 DOM 路径**实际不可达**（防御性代码），泛型路径才可达（用假 host 覆盖）。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  performGroupEnterTransition,
  performGroupLeaveTransition,
  applyFLIP,
  createFLIPState,
  beforeUpdate,
  afterUpdate,
} from '../src/transition-group';

// ============================================================
// 过渡桩：让 getComputedStyle 报告「有过渡」
// ============================================================

/**
 * @param durationMs 过渡时长（null 表示完全没有过渡）
 * @param delayMs 过渡延迟（用于构造「hasTransition 为真但 duration 为 0」的事件路径）
 */
function stubTransition(durationMs: number | null, delayMs = 0): void {
  const duration = durationMs === null ? '0s' : `${durationMs}ms`;
  const delay = `${delayMs}ms`;
  const css = {
    transitionDuration: duration,
    transitionDelay: delay,
    animationDuration: '0s',
    animationDelay: '0s',
    animationName: 'none',
    getPropertyValue(prop: string): string {
      switch (prop) {
        case 'transition-duration':
        case 'transitionDuration':
          return duration;
        case 'transition-delay':
        case 'transitionDelay':
          return delay;
        default:
          return '0s';
      }
    },
  };
  vi.stubGlobal('getComputedStyle', () => css);
}

/** 记录钩子调用顺序 */
function recorder() {
  const order: string[] = [];
  return {
    order,
    hook: (name: string) => () => order.push(name),
  };
}

function makeEl(cls = ''): HTMLElement {
  const el = document.createElement('div');
  if (cls) el.className = cls;
  document.body.appendChild(el);
  return el;
}

function fire(el: Element, type: 'transitionend' | 'animationend' = 'transitionend'): void {
  el.dispatchEvent(new Event(type, { bubbles: true }));
}

/**
 * 最小 RendererHost 假实现。
 *
 * 为什么需要它：`WebRendererHost.getTransitionInfo` 只看 duration，
 * **永远不会**返回 `hasTransition: true` 且 `duration: 0`，
 * 于是「走事件监听」那条分支对真实 host 不可达。用一个可编排的假 host 才能覆盖。
 */
function makeHost(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    getAttribute: (el: Element, n: string) => el.getAttribute(n),
    getBoundingClientRect: (el: Element) => el.getBoundingClientRect(),
    setStyle: (el: HTMLElement, k: string, v: string) => el.style.setProperty(k, v),
    forceReflow: () => {},
    addClass: (el: Element, c: string) => el.classList.add(c),
    removeClass: (el: Element, c: string) => el.classList.remove(c),
    getTransitionInfo: () => ({ hasTransition: false, hasAnimation: false, duration: 0 }),
    addEventListener: (el: Element, type: string, fn: (e: unknown) => void) => {
      el.addEventListener(type, fn as EventListener);
      return () => el.removeEventListener(type, fn as EventListener);
    },
    setTimeout: (fn: () => void, ms: number) => window.setTimeout(fn, ms),
    clearTimeout: (id: number) => window.clearTimeout(id),
    ...overrides,
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

// ============================================================
// 重载判别
// ============================================================

describe('重载判别', () => {
  it('★ 不写 name 的 DOM 调用不能被误判为泛型版', () => {
    stubTransition(null);
    const el = makeEl();
    const done = vi.fn();

    // 修复前：判别条件是 `'name' in props` ⇒ `{}` 被当成泛型版，
    // 把 Element 当 host 用 ⇒ `host.addClass is not a function`。
    expect(() => performGroupEnterTransition(el, {}, done)).not.toThrow();
    expect(done).toHaveBeenCalledTimes(1);

    const el2 = makeEl();
    const remove = vi.fn();
    expect(() => performGroupLeaveTransition(el2, {}, remove)).not.toThrow();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('传 RendererHost 时走泛型版（不受 props 形状影响）', () => {
    stubTransition(null);
    const host = makeHost();
    const el = makeEl();
    const done = vi.fn();

    performGroupEnterTransition(host as never, el as never, {} as never, done);

    expect(done).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// DOM 路径：enter
// ============================================================

describe('DOM 路径 · performGroupEnterTransition', () => {
  it('★ 有 CSS 过渡时不能「立刻完成」：done 要等 duration + 50ms', () => {
    stubTransition(300);
    vi.useFakeTimers();
    const el = makeEl();
    const done = vi.fn();

    performGroupEnterTransition(el, {}, done);

    // 修复前：DOM 版没有 onEnter 时**同步**移除 active/to 并调 done
    // ⇒ 300ms 的 enter 动画被立刻截断（leave 版早已修过，enter 漏了）。
    expect(done).not.toHaveBeenCalled();
    expect(el.classList.contains('v-enter-active')).toBe(true);
    expect(el.classList.contains('v-enter-to')).toBe(true);

    vi.advanceTimersByTime(349);
    expect(done).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledTimes(1);
    expect(el.classList.contains('v-enter-active')).toBe(false);
    expect(el.classList.contains('v-enter-to')).toBe(false);
  });

  it('delay 计入 duration：只有 delay 时按 delay + 50ms 定时完成', () => {
    // ⚠️ 注意：`getTransitionInfoDOM` 把 delay 加进 duration
    //    ⇒ DOM 路径的 `waitForTransitionEndDOM` 分支**实际不可达**（属防御性代码），
    //    所以这里断言的是「定时器路径」而非「事件路径」。
    stubTransition(0, 10);
    vi.useFakeTimers();
    const el = makeEl();
    const done = vi.fn();

    performGroupEnterTransition(el, {}, done);
    expect(done).not.toHaveBeenCalled();

    vi.advanceTimersByTime(59);
    expect(done).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('★ onBeforeEnter 必须被调用，且早于类名添加', () => {
    stubTransition(300);
    vi.useFakeTimers();
    const el = makeEl();
    const seen: string[] = [];

    performGroupEnterTransition(
      el,
      {
        onBeforeEnter: () => seen.push(`before:${el.className}`),
        onAfterEnter: () => seen.push('after'),
      },
      () => seen.push('done'),
    );

    // 修复前：DOM 版**完全没有** onBeforeEnter 调用点（只有泛型版有）
    expect(seen).toEqual(['before:']);

    vi.advanceTimersByTime(350);
    expect(seen).toEqual(['before:', 'after', 'done']);
  });

  it('★ 自定义 enterFromClass / enterActiveClass / enterToClass 生效', () => {
    stubTransition(300);
    vi.useFakeTimers();
    const el = makeEl();
    const done = vi.fn();

    performGroupEnterTransition(
      el,
      {
        name: 'v',
        enterFromClass: 'my-from',
        enterActiveClass: 'my-active',
        enterToClass: 'my-to',
      },
      done,
    );

    // 修复前：DOM 版只认 `${name}-enter-*`，三个自定义类名被完全忽略
    expect(el.classList.contains('my-active')).toBe(true);
    expect(el.classList.contains('my-to')).toBe(true);
    expect(el.classList.contains('v-enter-active')).toBe(false);

    vi.advanceTimersByTime(350);

    expect(el.classList.contains('my-active')).toBe(false);
    expect(el.classList.contains('my-to')).toBe(false);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('无过渡时立即完成（不挂监听、不等）', () => {
    stubTransition(null);
    const el = makeEl();
    const done = vi.fn();

    performGroupEnterTransition(el, {}, done);

    expect(done).toHaveBeenCalledTimes(1);
    expect(el.classList.contains('v-enter-active')).toBe(false);
  });

  it('有 onEnter 时由它决定完成时机（不自动完成）', () => {
    stubTransition(300);
    const el = makeEl();
    const done = vi.fn();
    let release: (() => void) | null = null;

    performGroupEnterTransition(
      el,
      {
        onEnter: (_el, d) => {
          release = d;
        },
      },
      done,
    );

    expect(done).not.toHaveBeenCalled();
    expect(el.classList.contains('v-enter-active')).toBe(true);

    release!();

    expect(done).toHaveBeenCalledTimes(1);
    expect(el.classList.contains('v-enter-active')).toBe(false);
  });
});

// ============================================================
// DOM 路径：leave
// ============================================================

describe('DOM 路径 · performGroupLeaveTransition', () => {
  it('有过渡时按 duration + 50ms 移除元素', () => {
    stubTransition(300);
    vi.useFakeTimers();
    const el = makeEl();
    const remove = vi.fn();

    performGroupLeaveTransition(el, {}, remove);

    expect(remove).not.toHaveBeenCalled();

    vi.advanceTimersByTime(350);

    expect(remove).toHaveBeenCalledTimes(1);
    expect(el.classList.contains('v-leave-active')).toBe(false);
  });

  it('delay 计入 duration：只有 delay 时按 delay + 50ms 定时移除', () => {
    stubTransition(0, 10);
    vi.useFakeTimers();
    const el = makeEl();
    const remove = vi.fn();

    performGroupLeaveTransition(el, {}, remove);
    expect(remove).not.toHaveBeenCalled();

    vi.advanceTimersByTime(59);
    expect(remove).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('★ onBeforeLeave 必须被调用，且早于类名添加', () => {
    stubTransition(300);
    vi.useFakeTimers();
    const el = makeEl();
    const seen: string[] = [];

    performGroupLeaveTransition(
      el,
      {
        onBeforeLeave: () => seen.push(`before:${el.className}`),
        onAfterLeave: () => seen.push('after'),
      },
      () => seen.push('remove'),
    );

    expect(seen).toEqual(['before:']);

    vi.advanceTimersByTime(350);
    expect(seen).toEqual(['before:', 'after', 'remove']);
  });

  it('★ 自定义 leaveFromClass / leaveActiveClass / leaveToClass 生效', () => {
    stubTransition(300);
    vi.useFakeTimers();
    const el = makeEl();
    const remove = vi.fn();

    performGroupLeaveTransition(
      el,
      { leaveFromClass: 'my-from', leaveActiveClass: 'my-active', leaveToClass: 'my-to' },
      remove,
    );

    expect(el.classList.contains('my-active')).toBe(true);
    expect(el.classList.contains('v-leave-active')).toBe(false);

    vi.advanceTimersByTime(350);

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('无过渡时立即移除', () => {
    stubTransition(null);
    const el = makeEl();
    const remove = vi.fn();

    performGroupLeaveTransition(el, {}, remove);

    expect(remove).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// 泛型（RendererHost）路径
// ============================================================

describe('泛型路径 · enter', () => {
  it('钩子顺序：onBeforeEnter → onEnter → onAfterEnter → done', () => {
    stubTransition(300);
    const host = makeHost();
    const el = makeEl();
    const r = recorder();
    let release: (() => void) | null = null;

    performGroupEnterTransition(
      host as never,
      el as never,
      {
        onBeforeEnter: r.hook('before'),
        onEnter: (_el: unknown, d: () => void) => {
          r.order.push('enter');
          release = d;
        },
        onAfterEnter: r.hook('after'),
      } as never,
      r.hook('done'),
    );

    expect(r.order).toEqual(['before', 'enter']);

    release!();
    expect(r.order).toEqual(['before', 'enter', 'after', 'done']);
  });

  it('有过渡且 duration > 0 时按 duration + 50ms 定时完成', () => {
    const host = makeHost({
      getTransitionInfo: () => ({ hasTransition: true, hasAnimation: false, duration: 120 }),
    });
    vi.useFakeTimers();
    const el = makeEl();
    const done = vi.fn();

    performGroupEnterTransition(host as never, el as never, {} as never, done);
    expect(done).not.toHaveBeenCalled();

    vi.advanceTimersByTime(169);
    expect(done).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('有过渡但 duration 为 0 时走事件监听，且只完成一次', () => {
    const host = makeHost({
      getTransitionInfo: () => ({ hasTransition: true, hasAnimation: false, duration: 0 }),
    });
    const el = makeEl();
    const done = vi.fn();

    performGroupEnterTransition(host as never, el as never, {} as never, done);
    expect(done).not.toHaveBeenCalled();

    fire(el);
    expect(done).toHaveBeenCalledTimes(1);

    // 再发一次不能重复完成（finished 标志）
    fire(el);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('无过渡时立即完成', () => {
    const host = makeHost();
    const el = makeEl();
    const done = vi.fn();

    performGroupEnterTransition(host as never, el as never, {} as never, done);

    expect(done).toHaveBeenCalledTimes(1);
  });
});

describe('泛型路径 · leave', () => {
  it('钩子顺序：onBeforeLeave → onLeave → onAfterLeave → remove', () => {
    stubTransition(300);
    const host = makeHost();
    const el = makeEl();
    const r = recorder();
    let release: (() => void) | null = null;

    performGroupLeaveTransition(
      host as never,
      el as never,
      {
        onBeforeLeave: r.hook('before'),
        onLeave: (_el: unknown, d: () => void) => {
          r.order.push('leave');
          release = d;
        },
        onAfterLeave: r.hook('after'),
      } as never,
      r.hook('remove'),
    );

    expect(r.order).toEqual(['before', 'leave']);

    release!();
    expect(r.order).toEqual(['before', 'leave', 'after', 'remove']);
  });

  it('有过渡且 duration > 0 时按 duration + 50ms 定时移除', () => {
    const host = makeHost({
      getTransitionInfo: () => ({ hasTransition: true, hasAnimation: false, duration: 80 }),
    });
    vi.useFakeTimers();
    const el = makeEl();
    const remove = vi.fn();

    performGroupLeaveTransition(host as never, el as never, {} as never, remove);
    vi.advanceTimersByTime(129);
    expect(remove).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('有过渡但 duration 为 0 时走事件监听', () => {
    const host = makeHost({
      getTransitionInfo: () => ({ hasTransition: true, hasAnimation: false, duration: 0 }),
    });
    const el = makeEl();
    const remove = vi.fn();

    performGroupLeaveTransition(host as never, el as never, {} as never, remove);
    expect(remove).not.toHaveBeenCalled();

    fire(el);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('无过渡时立即移除', () => {
    const host = makeHost();
    const el = makeEl();
    const remove = vi.fn();

    performGroupLeaveTransition(host as never, el as never, {} as never, remove);

    expect(remove).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// FLIP：move
// ============================================================

describe('FLIP · applyFLIP', () => {
  function box(kids: HTMLElement[]): void {
    const parent = document.createElement('div');
    kids.forEach((k) => parent.appendChild(k));
    document.body.appendChild(parent);
  }

  function keyed(topRef: { top: number }): HTMLElement {
    const el = document.createElement('i');
    el.setAttribute('data-key', 'a');
    box([el]);
    el.getBoundingClientRect = () => ({ left: 0, top: topRef.top, width: 0, height: 0 }) as DOMRect;
    return el;
  }

  it('DOM 版：有过渡时加 moveClass，过渡结束后移除', () => {
    stubTransition(300);
    const topRef = { top: 0 };
    const el = keyed(topRef);

    const oldPositions = new Map([['a', { left: 0, top: 0, width: 0, height: 0 }]]);
    topRef.top = 40;

    applyFLIP([el], oldPositions as never, 'v-move');

    expect(el.classList.contains('v-move')).toBe(true);

    fire(el);
    expect(el.classList.contains('v-move')).toBe(false);
  });

  it('DOM 版：无过渡时立即移除 moveClass（不留残留类）', () => {
    stubTransition(null);
    const topRef = { top: 0 };
    const el = keyed(topRef);

    const oldPositions = new Map([['a', { left: 0, top: 0, width: 0, height: 0 }]]);
    topRef.top = 40;

    applyFLIP([el], oldPositions as never, 'v-move');

    expect(el.classList.contains('v-move')).toBe(false);
  });

  it('泛型版：有过渡时加 moveClass，过渡结束后移除', () => {
    const host = makeHost({
      getTransitionInfo: () => ({ hasTransition: true, hasAnimation: false, duration: 300 }),
    });
    const topRef = { top: 0 };
    const el = keyed(topRef);

    const oldPositions = new Map([['a', { left: 0, top: 0, width: 0, height: 0 }]]);
    topRef.top = 40;

    applyFLIP(host as never, [el] as never, oldPositions as never, 'v-move');

    expect(el.classList.contains('v-move')).toBe(true);

    fire(el);
    expect(el.classList.contains('v-move')).toBe(false);
  });

  it('泛型版：位移小于阈值时不加 moveClass', () => {
    const host = makeHost({
      getTransitionInfo: () => ({ hasTransition: true, hasAnimation: false, duration: 300 }),
    });
    const topRef = { top: 0 };
    const el = keyed(topRef);

    const oldPositions = new Map([['a', { left: 0, top: 0.2, width: 0, height: 0 }]]);

    applyFLIP(host as never, [el] as never, oldPositions as never, 'v-move');

    expect(el.classList.contains('v-move')).toBe(false);
  });

  it('beforeUpdate 记录旧位置 / afterUpdate 应用 FLIP（泛型）', () => {
    const host = makeHost({
      getTransitionInfo: () => ({ hasTransition: true, hasAnimation: false, duration: 300 }),
    });
    const topRef = { top: 0 };
    const el = keyed(topRef);

    const state = createFLIPState() as never;
    beforeUpdate(host as never, state as never, [el] as never);

    expect((state as { oldPositions: Map<string, unknown> }).oldPositions.size).toBe(1);

    topRef.top = 30;
    afterUpdate(host as never, state as never, [el] as never, 'v-move');

    expect((state as { newPositions: Map<string, unknown> }).newPositions.size).toBe(1);
    expect(el.classList.contains('v-move')).toBe(true);
  });
});

// ============================================================
// 两条路径的一致性（防再次「只修一处」）
// ============================================================

describe('DOM 路径 与 泛型路径 的行为一致性', () => {
  /** 跑一次 enter，返回「钩子 + 各阶段类名」序列 */
  function runEnter(useHost: boolean): string[] {
    stubTransition(300);
    vi.useFakeTimers();
    const host = makeHost({
      getTransitionInfo: () => ({ hasTransition: true, hasAnimation: false, duration: 300 }),
    });
    const el = makeEl();
    const log: string[] = [];

    const props = {
      name: 'fade',
      onBeforeEnter: () => log.push(`before|${el.className}`),
      onAfterEnter: () => log.push(`after|${el.className}`),
    };
    const done = () => log.push(`done|${el.className}`);

    if (useHost) {
      performGroupEnterTransition(host as never, el as never, props as never, done);
    } else {
      performGroupEnterTransition(el, props as never, done);
    }

    log.push(`mid|${el.className}`);
    vi.advanceTimersByTime(350);
    log.push(`end|${el.className}`);

    return log;
  }

  /** 跑一次 leave */
  function runLeave(useHost: boolean): string[] {
    stubTransition(300);
    vi.useFakeTimers();
    const host = makeHost({
      getTransitionInfo: () => ({ hasTransition: true, hasAnimation: false, duration: 300 }),
    });
    const el = makeEl();
    const log: string[] = [];

    const props = {
      name: 'fade',
      onBeforeLeave: () => log.push(`before|${el.className}`),
      onAfterLeave: () => log.push(`after|${el.className}`),
    };
    const remove = () => log.push(`remove|${el.className}`);

    if (useHost) {
      performGroupLeaveTransition(host as never, el as never, props as never, remove);
    } else {
      performGroupLeaveTransition(el, props as never, remove);
    }

    log.push(`mid|${el.className}`);
    vi.advanceTimersByTime(350);
    log.push(`end|${el.className}`);

    return log;
  }

  it('★ enter：两条路径的类名序列与钩子序列必须一致', () => {
    const dom = runEnter(false);
    vi.useRealTimers();
    document.body.innerHTML = '';
    const host = runEnter(true);

    expect(dom).toEqual(host);
  });

  it('★ leave：两条路径的类名序列与钩子序列必须一致', () => {
    const dom = runLeave(false);
    vi.useRealTimers();
    document.body.innerHTML = '';
    const host = runLeave(true);

    expect(dom).toEqual(host);
  });
});
