// @vitest-environment node
/**
 * dom-runtime 覆盖率电池（node 环境版，Task C）
 *
 * 关键点：仓内 dom-runtime 的既有测试**全部跑在 jsdom 下**（`isBrowser === true`），
 * 因此源码里十几处 `if (!isBrowser) return;` 的「真分支」永远不会被执行。
 * 本文件显式声明 node 环境，从而一次性覆盖这些早返回分支，
 * 并顺带覆盖 normalizeClass / normalizeStyle 的非对象路径与 renderComponentVNode 的
 * setup/render/template 三条降级分支。
 */
import { describe, it, expect, vi } from 'vitest';
import {
  normalizeClass,
  normalizeStyle,
  insert,
  remove,
  clearChildren,
  setText,
  setHTML,
  setAttribute,
  removeAttribute,
  setProperty,
  setStyle,
  setClass,
  toggleClass,
  reconcileArray,
  flushSyncDOM,
  addEventListenerDelegate,
  removeEventListenerDelegate,
  cleanupElementDelegates,
  onCleanup,
  runCleanups,
  renderComponentVNode,
  bindEffect,
  batchDOM,
} from '../src/index';

describe('dom-runtime battery (node env): !isBrowser early returns', () => {
  it('no-op DOM mutators when not in a browser', () => {
    expect(() => insert(null, null)).not.toThrow();
    expect(() => remove(null)).not.toThrow();
    expect(() => clearChildren(null as unknown as Node)).not.toThrow();
    expect(() => setText(null, 'x')).not.toThrow();
    expect(() => setHTML(null, '<b>x</b>')).not.toThrow();
    expect(() => setAttribute(null, 'k', 'v')).not.toThrow();
    expect(() => removeAttribute(null, 'k')).not.toThrow();
    expect(() => setProperty(null, 'k', 'v')).not.toThrow();
    expect(() => setStyle(null, { color: 'red' })).not.toThrow();
    expect(() => setClass(null, 'a')).not.toThrow();
    expect(() => toggleClass(null, 'a')).not.toThrow();
    expect(() => flushSyncDOM()).not.toThrow();
  });

  it('batching / effect helpers degrade gracefully', () => {
    const dispose = bindEffect(() => {});
    expect(typeof dispose).toBe('function');
    dispose();
    expect(() => batchDOM(() => {})).not.toThrow();
  });

  it('delegate helpers are no-ops without a DOM', () => {
    const cancel = addEventListenerDelegate(null as unknown as Element, 'click', () => {});
    expect(typeof cancel).toBe('function');
    expect(() => cancel()).not.toThrow();
    expect(() =>
      removeEventListenerDelegate(null as unknown as Element, 'click', () => {}),
    ).not.toThrow();
    expect(() => cleanupElementDelegates(null as unknown as Element)).not.toThrow();
  });

  it('reconcileArray returns immediately without a DOM', () => {
    expect(() =>
      reconcileArray([], [1, 2], {
        key: (i: number) => i,
        create: () => null as unknown as Node,
      }),
    ).not.toThrow();
  });
});

describe('dom-runtime battery (node env): normalize / render helpers', () => {
  it('normalizeClass covers string / number / boolean / array / object', () => {
    expect(normalizeClass('a b')).toBe('a b');
    expect(normalizeClass(123)).toBe('123');
    expect(normalizeClass(null)).toBe('');
    expect(normalizeClass(undefined)).toBe('');
    expect(normalizeClass(false)).toBe('');
    expect(normalizeClass(['a', 'b'])).toBe('a b');
    expect(normalizeClass({ a: true, b: false })).toBe('a');
  });

  it('normalizeStyle covers string / number / null / object with px', () => {
    expect(normalizeStyle('color:red')).toBe('color:red');
    expect(normalizeStyle(null)).toBe('');
    expect(normalizeStyle(undefined)).toBe('');
    expect(normalizeStyle(false)).toBe('');
    expect(normalizeStyle(42)).toBe('42');
    expect(normalizeStyle({ width: 10, color: 'red' })).toContain('width:10px');
  });

  it('renderComponentVNode covers null / setup-fn / setup-object+render / render / template', () => {
    expect(renderComponentVNode(undefined, {}, {})).toBeNull();

    // setup 返回函数 → 直接作为 render
    const bySetupFn = renderComponentVNode({ setup: () => () => 'fn' }, {}, {});
    expect(bySetupFn).toBe('fn');

    // setup 返回对象 + 组件自带 render
    const byObject = renderComponentVNode(
      { setup: () => ({ a: 1 }), render: (ctx: any) => ctx.a },
      {},
      {},
    );
    expect(byObject).toBe(1);

    // 仅 render
    const byRender = renderComponentVNode({ render: () => 'r' }, {}, {});
    expect(byRender).toBe('r');

    // 只有 template → 开发期警告 + 返回 null
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(renderComponentVNode({ template: '<div/>', name: 'Alpha' }, {}, {})).toBeNull();
    warnSpy.mockRestore();

    // 匿名组件 + 无 render/template
    expect(renderComponentVNode({}, {}, {})).toBeNull();
  });
});

describe('dom-runtime battery (node env): runCleanups aggregates errors', () => {
  it('throws the single error when one cleanup fails', () => {
    onCleanup(() => {
      throw new Error('only');
    });
    expect(() => runCleanups()).toThrow('only');
  });

  it('throws an aggregate error when multiple cleanups fail', () => {
    onCleanup(() => {
      throw new Error('a');
    });
    onCleanup(() => {
      throw new Error('b');
    });
    let caught: unknown;
    try {
      runCleanups();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error & { errors: Error[] }).errors.length).toBe(2);
  });
});
