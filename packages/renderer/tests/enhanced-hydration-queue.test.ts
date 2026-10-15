// @vitest-environment jsdom
/**
 * 行为级判据：`enhanced-hydration` 的**非 `hydrateApp` 路径**
 *
 * ## 为什么要有这条
 *
 * `renderer/src/hydration/enhanced-hydration.ts`（728 行）覆盖率实测仅 ~34%：
 * 既有测试（`enhanced-hydration.test.ts`）**只覆盖 `hydrateApp`**，而同一模块还导出
 * `hydrateVisible` / `queueHydration` / `HydrationErrorHandler` / `safeHydrate` —— 一条都没判据。
 *
 * ## 环境事实（探针实测，2026-10-16）
 *
 * `requestIdleCallback` 与 `IntersectionObserver` 在 Node/jsdom 下**都是 undefined**
 * （前者在 Safari 也长期缺失）⇒ 这两条路径一旦被调用会直接抛 `ReferenceError`。
 * 本电池既覆盖正常路径（打桩），也**显式要求缺 API 时降级而非抛**。
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  HydrationErrorHandler,
  createHydrationErrorHandler,
  queueHydration,
  hydrateVisible,
  safeHydrate,
  type HydrationError,
} from '../src/hydration/enhanced-hydration';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
  vi.unstubAllGlobals();
});

const mkErr = (type: HydrationError['type'], node?: Element, message = 'm'): HydrationError => ({
  type,
  message,
  node,
});

const idleStub = (): void => {
  vi.stubGlobal('requestIdleCallback', (cb: (d: unknown) => void) => {
    setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 0);
  });
};

class IOStub {
  static instances: IOStub[] = [];
  cb: (entries: unknown[]) => void;
  targets: Element[] = [];
  constructor(cb: (entries: unknown[]) => void, _opts?: unknown) {
    this.cb = cb;
    IOStub.instances.push(this);
  }
  observe(el: Element): void {
    this.targets.push(el);
  }
  unobserve(el: Element): void {
    this.targets = this.targets.filter((t) => t !== el);
  }
  disconnect(): void {
    this.targets = [];
  }
  trigger(): void {
    void this.cb(this.targets.map((t) => ({ isIntersecting: true, target: t })));
  }
}

const mkHost = (html: string): HTMLElement => {
  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el);
  hosts.push(el);
  return el;
};

describe('HydrationErrorHandler — 恢复策略', () => {
  it('按错误类型给出策略：missing→fallback / invalid→rerender / script→keep-server', () => {
    const h = new HydrationErrorHandler();
    expect(h.handleError(mkErr('missing'))).toBe('fallback');
    expect(h.handleError(mkErr('invalid'))).toBe('rerender');
    expect(h.handleError(mkErr('script'))).toBe('keep-server');
  });

  it('记录错误并回调 onError', () => {
    const seen: HydrationError[] = [];
    const h = new HydrationErrorHandler({ onError: (e) => seen.push(e) });
    const err = mkErr('invalid');
    h.handleError(err);
    expect(seen).toEqual([err]);
    expect(h.getErrors()).toEqual([err]);
  });

  it('getErrors / getMismatches 返回**副本**（不泄漏内部数组）', () => {
    const h = new HydrationErrorHandler();
    h.handleError(mkErr('invalid'));
    const a = h.getErrors();
    a.push(mkErr('script'));
    expect(h.getErrors()).toHaveLength(1);
  });

  it('clear() 清空记录', () => {
    const h = new HydrationErrorHandler();
    h.handleError(mkErr('invalid'));
    h.clear();
    expect(h.getErrors()).toEqual([]);
    expect(h.getMismatches()).toEqual([]);
  });

  it('createHydrationErrorHandler 返回可用实例', () => {
    expect(createHydrationErrorHandler()).toBeInstanceOf(HydrationErrorHandler);
  });
});

describe('HydrationErrorHandler — 不匹配分类', () => {
  it('空白差异算轻微 ⇒ keep-server，并回调 onMismatch', () => {
    const seen: unknown[] = [];
    const h = new HydrationErrorHandler({ onMismatch: (m) => seen.push(m) });
    const node = mkHost('').firstElementChild;
    if (node) node.setAttribute('data-ssr-expected', '<div>  a  </div>');
    const strategy = h.handleError(mkErr('mismatch', node ?? undefined));
    expect(['keep-server', 'keep-client']).toContain(strategy);
    expect(h.getMismatches()).toHaveLength(1);
    expect(seen).toHaveLength(1);
  });

  it('标签数量不同 ⇒ 严重不匹配 ⇒ rerender', () => {
    const host = mkHost('<span>a</span>');
    const node = host.firstElementChild!;
    node.setAttribute('data-ssr-expected', '<div><i>a</i></div>');
    const h = new HydrationErrorHandler();
    expect(h.handleError(mkErr('mismatch', node))).toBe('rerender');
  });

  it('无节点时不抛，且给出策略', () => {
    const h = new HydrationErrorHandler();
    expect(() => h.handleError(mkErr('mismatch'))).not.toThrow();
  });

  it('不匹配记录里带节点路径', () => {
    const host = mkHost('<div><span>x</span></div>');
    const node = host.querySelector('span')!;
    node.setAttribute('data-ssr-expected', '<i>y</i>');
    const h = new HydrationErrorHandler();
    h.handleError(mkErr('mismatch', node));
    expect(h.getMismatches()[0]!.path).toContain('span');
  });
});

describe('queueHydration — 优先级队列', () => {
  it('★ 按 high → medium → low 执行（文档承诺"按优先级执行"）', async () => {
    idleStub();
    const order: string[] = [];
    queueHydration(document.createElement('div'), 'low', async () => void order.push('low'));
    queueHydration(document.createElement('div'), 'high', async () => void order.push('high'));
    queueHydration(document.createElement('div'), 'medium', async () => void order.push('medium'));
    await new Promise((r) => setTimeout(r, 60));
    expect(order).toEqual(['high', 'medium', 'low']);
  });

  it('同优先级保持入队顺序', async () => {
    idleStub();
    const order: string[] = [];
    queueHydration(document.createElement('div'), 'high', async () => void order.push('a'));
    queueHydration(document.createElement('div'), 'high', async () => void order.push('b'));
    await new Promise((r) => setTimeout(r, 60));
    expect(order).toEqual(['a', 'b']);
  });

  it('★ 缺 requestIdleCallback 时应降级而非抛，且队列不得"死掉"', async () => {
    const order: string[] = [];
    expect(() =>
      queueHydration(document.createElement('div'), 'high', async () => void order.push('x')),
    ).not.toThrow();
    await new Promise((r) => setTimeout(r, 40));
    expect(order).toEqual(['x']);
    // 排空循环若因缺 API 在 await 内抛而**静默死掉**，`isProcessingQueue` 会永为 true
    // ⇒ 之后入队的任务再也不会被执行（这正是"只断言 not.toThrow"会漏掉的形态）。
    queueHydration(document.createElement('div'), 'high', async () => void order.push('y'));
    await new Promise((r) => setTimeout(r, 40));
    expect(order).toEqual(['x', 'y']);
  });
});

describe('hydrateVisible', () => {
  it('容器不存在 ⇒ 抛错', async () => {
    await expect(hydrateVisible({}, '#not-exist-xyz')).rejects.toThrow(/container not found/);
  });

  it('无待水合元素时立即返回 0 统计', async () => {
    idleStub();
    vi.stubGlobal('IntersectionObserver', IOStub);
    const host = mkHost('<div>plain</div>');
    const { stats } = await hydrateVisible({}, host);
    expect(stats.totalNodes).toBe(0);
    expect(stats.hydratedNodes).toBe(0);
  });

  it('可见后水合带 data-hydrate 的元素', async () => {
    idleStub();
    vi.stubGlobal('IntersectionObserver', IOStub);
    IOStub.instances = [];
    const host = mkHost('<div data-hydrate="1"><span>ssr</span></div>');
    const p = hydrateVisible({}, host);
    await new Promise((r) => setTimeout(r, 20));
    IOStub.instances[IOStub.instances.length - 1]?.trigger();
    const { stats } = await p;
    expect(stats.totalNodes).toBe(1);
    expect(stats.hydratedNodes).toBe(1);
  });

  it('★ 缺 IntersectionObserver 时应降级为立即水合而非抛', async () => {
    idleStub();
    const host = mkHost('<div data-hydrate="1"><span>ssr</span></div>');
    const { stats } = await hydrateVisible({}, host);
    expect(stats.totalNodes).toBe(1);
    expect(stats.hydratedNodes).toBe(1);
  });
});

describe('safeHydrate', () => {
  it('正常路径返回 app / stats / errorHandler', async () => {
    idleStub();
    const host = mkHost('<div>hi</div>');
    const r = await safeHydrate({}, host);
    expect(r.errorHandler).toBeInstanceOf(HydrationErrorHandler);
    expect(r.stats).toBeTypeOf('object');
  });

  it('容器不存在时最终仍抛错（无容器可降级）', async () => {
    await expect(safeHydrate({}, '#not-exist-abc')).rejects.toThrow();
  });
});
