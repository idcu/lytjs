// @vitest-environment jsdom
/**
 * `adapter-web/src/web-dom-renderer.ts` 行为电池。
 *
 * 该文件此前 **142/256 语句未覆盖（45%）**。它有两块「看起来在做事、其实没接上」的机制：
 * ① P2-31 的**批量 DOM 操作队列**（导出了 4 个 queue* + 1 个 flush，全仓**无人调用**）；
 * ② `vnodeResourceMap` 资源清理（`cleanupVNodeResources` 会读它，但**全仓没有 set**）。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  queueInsert,
  queueRemove,
  queueSetText,
  queueSetElementText,
  flushPendingDOMOperations,
  defineCustomElement,
  isCustomElementRegistered,
  getRegisteredCustomElements,
  createDOMRenderer,
} from '../src/web-dom-renderer';
import { createVNode } from '@lytjs/vdom';

afterEach(() => {
  flushPendingDOMOperations();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

function newContainer(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('批量 DOM 操作队列', () => {
  it('queueInsert 后 flush ⇒ 节点被插入', () => {
    const parent = newContainer();
    const child = document.createElement('span');

    queueInsert(child, parent);
    flushPendingDOMOperations();

    expect(parent.firstChild).toBe(child);
  });

  it('★ 文本节点与元素节点交错入队 ⇒ 顺序必须与入队顺序一致', () => {
    // 原实现把「无 anchor 的元素」收进 DocumentFragment 先插，
    // 而文本节点走 otherOperations 后插 ⇒ **顺序被颠倒**。
    const parent = newContainer();
    const text = document.createTextNode('T');
    const el = document.createElement('b');

    queueInsert(text, parent);
    queueInsert(el, parent);
    flushPendingDOMOperations();

    expect(parent.childNodes[0]).toBe(text);
    expect(parent.childNodes[1]).toBe(el);
  });

  it('带 anchor 的 insert 落在 anchor 之前', () => {
    const parent = newContainer();
    const anchor = document.createElement('i');
    parent.appendChild(anchor);
    const child = document.createElement('span');

    queueInsert(child, parent, anchor);
    flushPendingDOMOperations();

    expect(parent.firstChild).toBe(child);
    expect(parent.childNodes[1]).toBe(anchor);
  });

  it('同父多个 append 插入保持入队顺序', () => {
    const parent = newContainer();
    const a = document.createElement('a');
    const b = document.createElement('b');
    const c = document.createElement('c');

    queueInsert(a, parent);
    queueInsert(b, parent);
    queueInsert(c, parent);
    flushPendingDOMOperations();

    expect(Array.from(parent.children)).toEqual([a, b, c]);
  });

  it('queueRemove 移除节点；父节点已不存在时不抛错', () => {
    const parent = newContainer();
    const child = document.createElement('span');
    parent.appendChild(child);
    const orphan = document.createElement('em');

    queueRemove(child);
    queueRemove(orphan);
    expect(() => flushPendingDOMOperations()).not.toThrow();

    expect(parent.childNodes.length).toBe(0);
  });

  it('queueSetText 改 nodeValue', () => {
    const text = document.createTextNode('old');

    queueSetText(text, 'new');
    flushPendingDOMOperations();

    expect(text.nodeValue).toBe('new');
  });

  it('queueSetElementText 改 textContent', () => {
    const el = document.createElement('div');
    el.textContent = 'old';

    queueSetElementText(el, 'new');
    flushPendingDOMOperations();

    expect(el.textContent).toBe('new');
  });

  it('空队列 flush 不抛错', () => {
    expect(() => flushPendingDOMOperations()).not.toThrow();
  });

  it('flush 之后队列已清空（再次 flush 不会重复执行）', () => {
    const parent = newContainer();
    const child = document.createElement('span');

    queueInsert(child, parent);
    flushPendingDOMOperations();
    flushPendingDOMOperations();

    expect(parent.childNodes.length).toBe(1);
  });
});

describe('defineCustomElement', () => {
  it('合法名称注册成功，并出现在已注册列表里', () => {
    class X1 extends HTMLElement {}

    expect(defineCustomElement('test-battery-x1', X1)).toBe(true);
    expect(isCustomElementRegistered('test-battery-x1')).toBe(true);
    expect(getRegisteredCustomElements()).toContain('test-battery-x1');
    expect(customElements.get('test-battery-x1')).toBe(X1);
  });

  it('重复注册同一名称 ⇒ false（走缓存）', () => {
    class X2 extends HTMLElement {}

    expect(defineCustomElement('test-battery-x2', X2)).toBe(true);
    expect(defineCustomElement('test-battery-x2', X2)).toBe(false);
  });

  it('★ 名称不含连字符 ⇒ 警告并返回 false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    class X3 extends HTMLElement {}

    expect(defineCustomElement('nohyphen', X3)).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('must contain a hyphen'));
  });

  it('已被别处注册 ⇒ false，并记入缓存', () => {
    class X4 extends HTMLElement {}
    customElements.define('test-battery-x4', X4);

    expect(defineCustomElement('test-battery-x4', class extends HTMLElement {})).toBe(false);
    expect(isCustomElementRegistered('test-battery-x4')).toBe(true);
  });

  it('★ 非法名称（大写）导致 define 抛错 ⇒ 捕获后警告并返回 false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    class X5 extends HTMLElement {}

    expect(defineCustomElement('Test-Battery-Bad', X5)).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to define custom element'),
      expect.anything(),
    );
  });
});

describe('DOMRenderer', () => {
  it('render 首次挂载、再次 render 走 patch 更新', () => {
    const container = newContainer();
    const renderer = createDOMRenderer();

    renderer.render(createVNode('div', null, 'v1'), container);
    expect(container.textContent).toBe('v1');

    renderer.render(createVNode('div', null, 'v2'), container);
    expect(container.textContent).toBe('v2');
  });

  it('render(null) 卸载并清空容器', () => {
    const container = newContainer();
    const renderer = createDOMRenderer();
    renderer.render(createVNode('div', null, 'x'), container);

    renderer.render(null, container);

    expect(container.childNodes.length).toBe(0);
  });

  it('render(null) 于空容器不抛错', () => {
    const renderer = createDOMRenderer();

    expect(() => renderer.render(null, newContainer())).not.toThrow();
  });

  it('unmount 移除对应 DOM', () => {
    const container = newContainer();
    const renderer = createDOMRenderer();
    const vnode = createVNode('div', null, 'x');
    renderer.mount(vnode, container);

    renderer.unmount(vnode);

    expect(container.childNodes.length).toBe(0);
  });

  it('move 把节点移到新容器', () => {
    const from = newContainer();
    const to = newContainer();
    const renderer = createDOMRenderer();
    const vnode = createVNode('div', null, 'x');
    renderer.mount(vnode, from);

    renderer.move(vnode, to, null);

    expect(from.childNodes.length).toBe(0);
    expect(to.firstChild).toBe(vnode.el);
  });

  it('hydrate 复用容器内既有 DOM', () => {
    const container = newContainer();
    container.innerHTML = '<div>ssr</div>';
    const renderer = createDOMRenderer();
    const vnode = createVNode('div', null, 'ssr');

    renderer.hydrate(vnode, container);

    expect(vnode.el).toBe(container.firstChild);
  });

  it('★ trackResource 注册的清理函数在 unmount 时被调用', () => {
    const container = newContainer();
    const renderer = createDOMRenderer();
    const cleanup = vi.fn();
    const vnode = createVNode('div', null, 'x');
    renderer.mount(vnode, container);

    // 此前 `vnodeResourceMap` **只有 get 没有 set** ⇒ 这段清理永远空转
    renderer.trackResource(vnode, cleanup);
    renderer.unmount(vnode);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('★ 单个清理函数抛错不影响其它清理函数', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const container = newContainer();
    const renderer = createDOMRenderer();
    const good = vi.fn();
    const vnode = createVNode('div', null, 'x');
    renderer.mount(vnode, container);

    renderer.trackResource(vnode, () => {
      throw new Error('cleanup-boom');
    });
    renderer.trackResource(vnode, good);

    expect(() => renderer.unmount(vnode)).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
  });

  it('★ render(null) 卸载时同样会清理资源', () => {
    const container = newContainer();
    const renderer = createDOMRenderer();
    const cleanup = vi.fn();
    const vnode = createVNode('div', null, 'x');
    renderer.render(vnode, container);

    renderer.trackResource(vnode, cleanup);
    renderer.render(null, container);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('清理是幂等的（重复 unmount 不会重复调用）', () => {
    const container = newContainer();
    const renderer = createDOMRenderer();
    const cleanup = vi.fn();
    const vnode = createVNode('div', null, 'x');
    renderer.mount(vnode, container);

    renderer.trackResource(vnode, cleanup);
    renderer.unmount(vnode);
    renderer.unmount(vnode);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
