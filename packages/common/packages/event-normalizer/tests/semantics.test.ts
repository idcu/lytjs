/**
 * @lytjs/common-event-normalizer 修饰符语义回归（2026-11-03）
 *
 * 与 `@lytjs/adapter-web` 的 `patchEvent` 是**同一语义的两份实现**：
 * 同一张场景表在两边必须得到相同结果（门禁 `check-event-semantics` 就是这么跑的）。
 */
import { describe, it, expect } from 'vitest';
import { EventNormalizer } from '../src';

interface FakeEl {
  children: FakeEl[];
  parent: FakeEl | null;
  listeners: Map<string, Array<{ fn: (e: any) => void; capture?: boolean; once?: boolean }>>;
}

function createHost() {
  const makeEl = (): FakeEl => ({ children: [], parent: null, listeners: new Map() });
  const host: any = {
    addEventListener(el: FakeEl, type: string, fn: any, options: any) {
      const list = el.listeners.get(type) ?? [];
      const entry = { fn, capture: options?.capture, once: options?.once };
      list.push(entry);
      el.listeners.set(type, list);
      return () => {
        const cur = el.listeners.get(type) ?? [];
        const i = cur.indexOf(entry);
        if (i >= 0) cur.splice(i, 1);
      };
    },
    removeEventListener(el: FakeEl, type: string, fn: any, options: any) {
      const cur = el.listeners.get(type) ?? [];
      const i = cur.findIndex(
        (e) => e.fn === fn && Boolean(e.capture) === Boolean(options?.capture),
      );
      if (i >= 0) cur.splice(i, 1);
    },
  };

  function attach(parent: FakeEl, child: FakeEl) {
    parent.children.push(child);
    child.parent = parent;
  }

  function dispatch(target: FakeEl, type: string) {
    const path: FakeEl[] = [];
    for (let node: FakeEl | null = target; node; node = node.parent) path.push(node);
    const event: any = {
      type,
      target,
      currentTarget: null,
      stopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.stopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    };
    for (let i = path.length - 1; i >= 0 && !event.stopped; i--) {
      event.currentTarget = path[i];
      for (const entry of [...(path[i]!.listeners.get(type) ?? [])]) {
        if (entry.capture) entry.fn(event);
      }
    }
    for (let i = 0; i < path.length && !event.stopped; i++) {
      event.currentTarget = path[i];
      for (const entry of [...(path[i]!.listeners.get(type) ?? [])]) {
        if (entry.capture) continue;
        entry.fn(event);
        if (entry.once) {
          const cur = path[i]!.listeners.get(type) ?? [];
          const idx = cur.indexOf(entry);
          if (idx >= 0) cur.splice(idx, 1);
        }
      }
    }
    return event;
  }

  return { host, makeEl, attach, dispatch, normalizer: new EventNormalizer(host) };
}

describe('EventNormalizer 修饰符语义', () => {
  it('.self：子元素点击不触发 handler，也不阻止冒泡', () => {
    const { makeEl, attach, dispatch, normalizer } = createHost();
    const outer = makeEl();
    const mid = makeEl();
    const inner = makeEl();
    attach(outer, mid);
    attach(mid, inner);

    let outerHit = 0;
    outer.listeners.set('click', [{ fn: () => outerHit++ }]);
    let handlerHit = 0;
    normalizer.patchEvent(mid as any, 'onClick.self.stop', () => handlerHit++);

    dispatch(inner, 'click');
    expect(handlerHit).toBe(0);
    expect(outerHit).toBe(1);
  });

  it('.once 更新 handler 后重新武装', () => {
    const { makeEl, dispatch, normalizer } = createHost();
    const node = makeEl();
    let a = 0;
    let b = 0;

    normalizer.patchEvent(node as any, 'onClick.once', () => a++);
    dispatch(node, 'click');
    normalizer.patchEvent(node as any, 'onClick.once', () => b++);
    dispatch(node, 'click');

    expect([a, b]).toEqual([1, 1]);
  });

  it('修饰符更新（click → click.stop）生效', () => {
    const { makeEl, attach, dispatch, normalizer } = createHost();
    const outer = makeEl();
    const node = makeEl();
    attach(outer, node);
    let outerHit = 0;
    outer.listeners.set('click', [{ fn: () => outerHit++ }]);

    normalizer.patchEvent(node as any, 'onClick', () => {});
    normalizer.patchEvent(node as any, 'onClick.stop', () => {});
    dispatch(node, 'click');

    expect(outerHit).toBe(0);
  });

  it('removeAllEventListeners 后不再触发', () => {
    const { makeEl, dispatch, normalizer } = createHost();
    const node = makeEl();
    let n = 0;
    normalizer.patchEvent(node as any, 'onClick', () => n++);
    normalizer.removeAllEventListeners(node as any);
    dispatch(node, 'click');
    expect(n).toBe(0);
  });
});
