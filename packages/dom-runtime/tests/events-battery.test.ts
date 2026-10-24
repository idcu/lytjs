// @vitest-environment jsdom
/**
 * `@lytjs/dom-runtime` 的事件委托层。
 *
 * 这个模块此前**一条判据都没有**（100 条语句 0% 覆盖）。它对外提供
 * `delegateEvent` / `delegateEventBatch` 与三个 `stop*` 便捷函数。
 *
 * 判据重点：**同一容器上的多种事件类型**。委托的全部意义就是「一个容器少挂监听」，
 * 而「多种类型」正是最容易写错的地方。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  delegateEvent,
  delegateEventBatch,
  stopPropagation,
  preventDefault,
  stopEvent,
  isValidEventType,
  COMMON_EVENTS,
} from '../src/events';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  document.body.innerHTML = '';
});

function click(el: Element): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function input(el: Element): void {
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function child(tag = 'button', cls = 'btn'): HTMLElement {
  const el = document.createElement(tag);
  el.className = cls;
  root.appendChild(el);
  return el;
}

describe('delegateEvent · 基本委托', () => {
  it('匹配选择器时把 (event, matched) 传给 handler', () => {
    const btn = child();
    const handler = vi.fn();

    delegateEvent(root, 'click', '.btn', handler);
    click(btn);

    expect(handler).toHaveBeenCalledTimes(1);
    const [event, matched] = handler.mock.calls[0] as [Event, Element];
    expect(event).toBeInstanceOf(Event);
    expect(matched).toBe(btn);
  });

  it('选择器不匹配时不调用', () => {
    const other = child('span', 'other');
    const handler = vi.fn();

    delegateEvent(root, 'click', '.btn', handler);
    click(other);

    expect(handler).not.toHaveBeenCalled();
  });

  it('空选择器表示容器自身', () => {
    const handler = vi.fn();

    delegateEvent(root, 'click', '', handler);
    click(root);

    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0] as [Event, Element])[1]).toBe(root);
  });

  it('嵌套元素冒泡到容器时匹配最近的选择器祖先', () => {
    const btn = child();
    const inner = document.createElement('i');
    btn.appendChild(inner);
    const handler = vi.fn();

    delegateEvent(root, 'click', '.btn', handler);
    click(inner);

    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0] as [Event, Element])[1]).toBe(btn);
  });

  it('同类型多个 handler 都触发', () => {
    const btn = child();
    const a = vi.fn();
    const b = vi.fn();

    delegateEvent(root, 'click', '.btn', a);
    delegateEvent(root, 'click', '.btn', b);
    click(btn);

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('★ 同一容器上的第二种事件类型也必须触发', () => {
    const btn = child();
    const onInput = document.createElement('input');
    onInput.className = 'field';
    root.appendChild(onInput);

    const clickHandler = vi.fn();
    const inputHandler = vi.fn();

    delegateEvent(root, 'click', '.btn', clickHandler);
    delegateEvent(root, 'input', '.field', inputHandler);

    // 修复前：原生监听器只在**第一次**注册时创建，且闭包里写死了那次的事件类型
    // ⇒ 第二种类型（input）压根没有监听器，永远不触发。
    click(btn);
    input(onInput);

    expect(clickHandler).toHaveBeenCalledTimes(1);
    expect(inputHandler).toHaveBeenCalledTimes(1);
  });
});

describe('delegateEvent · 注销', () => {
  it('注销后不再触发', () => {
    const btn = child();
    const handler = vi.fn();

    const off = delegateEvent(root, 'click', '.btn', handler);
    off();
    click(btn);

    expect(handler).not.toHaveBeenCalled();
  });

  it('只注销其中一个，另一个继续工作', () => {
    const btn = child();
    const a = vi.fn();
    const b = vi.fn();

    const offA = delegateEvent(root, 'click', '.btn', a);
    delegateEvent(root, 'click', '.btn', b);

    offA();
    click(btn);

    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('★ 全部注销后重新注册，仍能正常工作', () => {
    const btn = child();
    const first = vi.fn();
    const second = vi.fn();

    const off = delegateEvent(root, 'click', '.btn', first);
    off();
    click(btn);
    expect(first).not.toHaveBeenCalled();

    // 修复前：注销时把 `_nativeHandler` 删了，但 `events` 对象若还有其它键就会残留
    // ⇒ 再次注册时「events 已存在」⇒ 不重新挂监听 ⇒ 委托永久失效。
    delegateEvent(root, 'click', '.btn', second);
    click(btn);

    expect(second).toHaveBeenCalledTimes(1);
  });

  it('★ 注销一种类型不影响另一种类型', () => {
    const btn = child();
    const field = document.createElement('input');
    field.className = 'field';
    root.appendChild(field);

    const clickHandler = vi.fn();
    const inputHandler = vi.fn();

    const offClick = delegateEvent(root, 'click', '.btn', clickHandler);
    delegateEvent(root, 'input', '.field', inputHandler);

    offClick();
    click(btn);
    input(field);

    expect(clickHandler).not.toHaveBeenCalled();
    expect(inputHandler).toHaveBeenCalledTimes(1);
  });

  it('重复调用注销函数是安全的', () => {
    const btn = child();
    const handler = vi.fn();

    const off = delegateEvent(root, 'click', '.btn', handler);
    off();
    expect(() => off()).not.toThrow();

    delegateEvent(root, 'click', '.btn', handler);
    click(btn);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('delegateEventBatch', () => {
  it('批量注册多种事件，统一注销', () => {
    const btn = child();
    const field = document.createElement('input');
    field.className = 'field';
    root.appendChild(field);

    const onClick = vi.fn();
    const onInput = vi.fn();

    const offAll = delegateEventBatch(root, [
      { eventType: 'click', selector: '.btn', handler: onClick },
      { eventType: 'input', selector: '.field', handler: onInput },
    ]);

    click(btn);
    input(field);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onInput).toHaveBeenCalledTimes(1);

    offAll();
    click(btn);
    input(field);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onInput).toHaveBeenCalledTimes(1);
  });

  it('空配置数组返回可安全调用的注销函数', () => {
    const off = delegateEventBatch(root, []);
    expect(() => off()).not.toThrow();
  });
});

describe('便捷函数', () => {
  it('stopPropagation 阻止冒泡', () => {
    const btn = child();
    const onRoot = vi.fn();

    root.addEventListener('click', onRoot);
    delegateEvent(root, 'click', '.btn', (e) => stopPropagation(e));

    click(btn);

    // 委托处理器挂在 root 上，自身会收到事件；阻止冒泡后不再往 document 传
    expect(onRoot).toHaveBeenCalledTimes(1);
  });

  it('preventDefault 取消默认行为', () => {
    const event = new Event('submit', { cancelable: true });

    preventDefault(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('stopEvent 同时阻止两者', () => {
    const event = new Event('click', { cancelable: true, bubbles: true });
    const parent = vi.fn();
    const container = document.createElement('div');
    container.appendChild(root);
    document.body.appendChild(container);
    container.addEventListener('click', parent);

    stopEvent(event);
    root.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(parent).not.toHaveBeenCalled();
  });

  it('stopPropagation 真的拦住冒泡', () => {
    const outer = vi.fn();
    document.body.addEventListener('click', outer);

    root.addEventListener('click', (e) => stopPropagation(e));
    click(root);

    expect(outer).not.toHaveBeenCalled();
  });
});

describe('事件类型表', () => {
  it('isValidEventType 只认表内类型', () => {
    expect(isValidEventType('click')).toBe(true);
    expect(isValidEventType('keydown')).toBe(true);
    expect(isValidEventType('not-an-event')).toBe(false);
    expect(isValidEventType('')).toBe(false);
  });

  it('COMMON_EVENTS 无重复且都能通过校验', () => {
    expect(new Set(COMMON_EVENTS).size).toBe(COMMON_EVENTS.length);
    for (const t of COMMON_EVENTS) expect(isValidEventType(t)).toBe(true);
  });
});

describe('SSR 守卫', () => {
  it('没有 document 时返回 no-op 且不抛错', () => {
    const realDocument = globalThis.document;
    (globalThis as { document?: Document }).document = undefined;

    try {
      const el = { addEventListener: vi.fn() } as unknown as Element;
      const off = delegateEvent(el, 'click', '.btn', () => {});

      expect(typeof off).toBe('function');
      expect(() => off()).not.toThrow();
      expect(
        (el as unknown as { addEventListener: ReturnType<typeof vi.fn> }).addEventListener,
      ).not.toHaveBeenCalled();
    } finally {
      (globalThis as { document?: Document }).document = realDocument;
    }
  });
});
