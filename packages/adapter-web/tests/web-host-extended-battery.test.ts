// @vitest-environment jsdom
/**
 * 行为级判据：`@lytjs/adapter-web` 的**扩展 Web 宿主**（`src/web-host-extended.ts`，713 行）
 *
 * ## 为什么要有这条
 *
 * 实测该文件 **196/273 语句未覆盖（28.2%）**，缺口几乎全在 `createExtendedWebHost` 返回的
 * 那一大批宿主方法里（426-667）—— 属性/样式/事件/查询/滚动/尺寸。
 * 这些方法是**渲染器操作 DOM 的唯一通道**，写错一个就会让整类更新行为出错（且往往静默）。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createExtendedWebHost } from '../src/web-host-extended';

type Host = ReturnType<typeof createExtendedWebHost>;

let host: Host;
let container: HTMLElement;

beforeEach(() => {
  // jsdom 未实现 scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
  host = createExtendedWebHost({ baseHost: {} as never });
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ==================== 树操作 ====================

describe('树操作', () => {
  it('insertBefore / replaceChild / firstChild / lastChild', () => {
    const a = document.createElement('span');
    const b = document.createElement('span');
    container.appendChild(a);

    host.insertBefore(container, b, a);
    expect(container.firstChild).toBe(b);

    const c = document.createElement('i');
    const replaced = host.replaceChild(container, c, b);
    expect(replaced).toBe(b);
    expect(container.firstChild).toBe(c);

    expect(host.firstChild(container)).toBe(c);
    // 原 a 仍在，所以 lastChild 是 a（不是 c）
    expect(host.lastChild(container)).toBe(a);
  });

  it('DocumentFragment 作为父节点也能插入', () => {
    const frag = document.createDocumentFragment();
    const a = document.createElement('span');

    host.insertBefore(frag, a, null);

    expect(host.firstChild(frag)).toBe(a);
  });

  it('contains：Element 判定 / 非 Element 返回 false', () => {
    const child = document.createElement('span');
    container.appendChild(child);

    expect(host.contains(container, child)).toBe(true);
    expect(host.contains(container, document.createElement('span'))).toBe(false);
    expect(host.contains({} as never, child)).toBe(false);
  });
});

// ==================== 属性 ====================

describe('属性操作', () => {
  it('getAttributeNames 返回数组', () => {
    const el = document.createElement('div');
    el.setAttribute('a', '1');
    el.setAttribute('b', '2');

    expect(host.getAttributeNames(el).sort()).toEqual(['a', 'b']);
  });

  it('setAttributes：null/undefined ⇒ 移除，其余转字符串', () => {
    const el = document.createElement('div');
    el.setAttribute('old', 'x');

    host.setAttributes(el, { keep: 'v', num: 3, flag: true, old: null, gone: undefined });

    expect(el.getAttribute('keep')).toBe('v');
    expect(el.getAttribute('num')).toBe('3');
    expect(el.getAttribute('flag')).toBe('true');
    expect(el.hasAttribute('old')).toBe(false);
    expect(el.hasAttribute('gone')).toBe(false);
  });

  it('removeAttributes 批量移除', () => {
    const el = document.createElement('div');
    el.setAttribute('a', '1');
    el.setAttribute('b', '2');

    host.removeAttributes(el, ['a', 'b']);

    expect(host.getAttributeNames(el)).toEqual([]);
  });
});

// ==================== 样式 / 类名 ====================

describe('样式与类名', () => {
  it('setStyles：null 移除、数值转字符串', () => {
    const el = document.createElement('div');
    el.style.setProperty('color', 'red');

    host.setStyles(el, { color: null, width: '10px', '--n': 5 });

    expect(el.style.getPropertyValue('color')).toBe('');
    expect(el.style.getPropertyValue('width')).toBe('10px');
    // 数值会被 String() 转成 '5'（自定义属性对任意字符串都合法）
    expect(el.style.getPropertyValue('--n')).toBe('5');
  });

  it('getClassList / toggleClass（含 force）', () => {
    const el = document.createElement('div');
    el.classList.add('a');

    expect(host.getClassList(el)).toEqual(['a']);

    expect(host.toggleClass(el, 'b')).toBe(true);
    expect(host.getClassList(el).sort()).toEqual(['a', 'b']);

    expect(host.toggleClass(el, 'b', false)).toBe(false);
    expect(host.getClassList(el)).toEqual(['a']);
  });
});

// ==================== 事件 ====================

describe('dispatchEvent', () => {
  it('派发普通事件', () => {
    const el = document.createElement('div');
    const spy = vi.fn();
    el.addEventListener('ping', spy);

    host.dispatchEvent(el, 'ping');

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('带 detail ⇒ 派发 CustomEvent', () => {
    const el = document.createElement('div');
    let detail: unknown;
    el.addEventListener('custom', (e) => {
      detail = (e as CustomEvent).detail;
    });

    host.dispatchEvent(el, 'custom', { n: 1 });

    expect(detail).toEqual({ n: 1 });
  });
});

describe('onceEventListener', () => {
  it('只触发一次', () => {
    const el = document.createElement('div');
    const spy = vi.fn();

    host.onceEventListener(el, 'tick', spy);
    el.dispatchEvent(new Event('tick'));
    el.dispatchEvent(new Event('tick'));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('handler 收到包装后的 HostEvent（type / nativeEvent / preventDefault 可用）', () => {
    const el = document.createElement('div');
    let received: Record<string, unknown> | null = null;

    host.onceEventListener(el, 'tick', (e) => {
      received = e as unknown as Record<string, unknown>;
    });
    el.dispatchEvent(new Event('tick', { cancelable: true }));

    expect(received!.type).toBe('tick');
    expect(received!.nativeEvent).toBeInstanceOf(Event);
    expect(typeof received!.preventDefault).toBe('function');
  });

  it('返回的函数可手动注销', () => {
    const el = document.createElement('div');
    const spy = vi.fn();

    const off = host.onceEventListener(el, 'tick', spy);
    off();
    el.dispatchEvent(new Event('tick'));

    expect(spy).not.toHaveBeenCalled();
  });

  it('★ handler 抛错时也必须注销（once 不能被一次异常废掉）', () => {
    const el = document.createElement('div');
    const spy = vi.fn(() => {
      throw new Error('handler-boom');
    });

    // jsdom 会把监听器里的异常上报到 window 的 error 事件；`preventDefault()` 表示"已处理"，
    // 否则 vitest 会把整个 run 记为 unhandled error（虽然断言都过了）。
    const swallow = (e: Event) => e.preventDefault();
    window.addEventListener('error', swallow);

    try {
      host.onceEventListener(el, 'tick', spy);

      expect(() => el.dispatchEvent(new Event('tick'))).not.toThrow();
      expect(() => el.dispatchEvent(new Event('tick'))).not.toThrow();
    } finally {
      window.removeEventListener('error', swallow);
    }

    // 修复前：注销语句在 handler 之后，抛错就跳过了 ⇒ 第二次还会调
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ==================== 查询 ====================

describe('DOM 查询', () => {
  it('querySelectorAll：默认从 document 查，也可指定上下文', () => {
    const a = document.createElement('span');
    a.className = 'q';
    container.appendChild(a);

    expect(host.querySelectorAll('.q')).toContain(a);
    expect(host.querySelectorAll('.q', container)).toEqual([a]);
    expect(host.querySelectorAll('.q', document.createElement('div'))).toEqual([]);
  });

  it('getElementById', () => {
    const el = document.createElement('div');
    el.id = 'target';
    container.appendChild(el);

    expect(host.getElementById('target')).toBe(el);
    expect(host.getElementById('nope')).toBeNull();
  });

  it('getElementsByClassName / getElementsByTagName（默认从 body 查）', () => {
    const el = document.createElement('p');
    el.className = 'pc';
    container.appendChild(el);

    expect(host.getElementsByClassName('pc')).toContain(el);
    expect(host.getElementsByTagName('p')).toContain(el);
    expect(host.getElementsByClassName('pc', container)).toEqual([el]);
  });
});

// ==================== 滚动 ====================

describe('滚动', () => {
  it('scrollIntoView 透传选项', () => {
    const el = document.createElement('div');

    host.scrollIntoView(el, { block: 'center' });

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
  });

  it('getScrollPosition：元素读自身，null 读窗口', () => {
    const el = document.createElement('div');
    el.scrollLeft = 5;
    el.scrollTop = 7;

    expect(host.getScrollPosition(el)).toEqual({ scrollLeft: 5, scrollTop: 7 });
    // jsdom 下窗口滚动恒为 0
    expect(host.getScrollPosition(null)).toEqual({ scrollLeft: 0, scrollTop: 0 });
  });

  it('setScrollPosition：元素写自身', () => {
    const el = document.createElement('div');

    host.setScrollPosition(el, 3, 4);

    expect(el.scrollLeft).toBe(3);
    expect(el.scrollTop).toBe(4);
  });
});

// ==================== 尺寸 ====================

describe('尺寸与位置', () => {
  it('getElementSize：HTMLElement 带 client/scroll 尺寸', () => {
    const el = document.createElement('div');

    const size = host.getElementSize(el);

    expect(size).toHaveProperty('width');
    expect(size).toHaveProperty('clientWidth');
    expect(size).toHaveProperty('scrollHeight');
  });

  it('★ SVG 元素没有 client/scroll 尺寸 ⇒ 必须为 0（不能是 undefined）', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    const size = host.getElementSize(svg);

    expect(size.clientWidth).toBe(0);
    expect(size.clientHeight).toBe(0);
    expect(size.scrollWidth).toBe(0);
    expect(size.scrollHeight).toBe(0);
  });

  it('getElementOffset 返回 left/top', () => {
    const el = document.createElement('div');

    const offset = host.getElementOffset(el);

    expect(typeof offset.left).toBe('number');
    expect(typeof offset.top).toBe('number');
  });
});
