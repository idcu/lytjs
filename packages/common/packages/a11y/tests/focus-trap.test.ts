/**
 * @lytjs/common-a11y —— `focusTrap` 的行为回归（2026-11-04）
 *
 * 这些用例锁的是「**焦点陷阱在真实使用场景里是否真的困住焦点**」，
 * 不是「函数存在 / 返回了 cleanup」这类形状断言。
 *
 * 背景：`focusTrap` 从落地起就**没有任何调用方** —— 于是它的三处缺陷
 * （列表只算一次、空容器 focus 空操作、从不恢复焦点）一直没有暴露。
 * 本轮把它接进 Modal / Dialog / Drawer 之后，这三处立刻变成了真问题。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { focusTrap, isFocusable, isHiddenFromAccessibility, getFocusableElements } from '../src';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  root.remove();
});

const button = (text: string): HTMLButtonElement => {
  const el = document.createElement('button');
  el.textContent = text;
  return el;
};

const pressTab = (shiftKey = false): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event;
};

describe('focusTrap：可聚焦列表必须每次重算', () => {
  it('动态新增的最后一个元素也要被算进陷阱（Tab 从它继续应回到第一个）', () => {
    const first = button('1');
    root.appendChild(first);

    const release = focusTrap(root);
    expect(document.activeElement).toBe(first);

    const second = button('2');
    root.appendChild(second);
    second.focus();
    expect(document.activeElement).toBe(second);

    // 旧实现：`lastElement` 在创建时就是 first ⇒ 从 second 按 Tab 既不是 first
    // 也不是 last ⇒ 不 preventDefault ⇒ 焦点**逃出**对话框
    const event = pressTab();
    expect(document.activeElement).toBe(first);
    expect(event.defaultPrevented).toBe(true);

    release();
  });

  it('Shift+Tab 从第一个回绕到最后一个', () => {
    const first = button('1');
    const second = button('2');
    root.append(first, second);

    const release = focusTrap(root);
    first.focus();

    const event = pressTab(true);
    expect(document.activeElement).toBe(second);
    expect(event.defaultPrevented).toBe(true);

    release();
  });
});

describe('focusTrap：容器内没有可聚焦元素', () => {
  it('临时给容器加 tabindex=-1 并让它拿到焦点，解除时摘掉', () => {
    root.textContent = 'loading...';
    const release = focusTrap(root);

    expect(root.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(root);

    release();
    expect(root.getAttribute('tabindex')).toBeNull();
  });

  it('Tab 被阻止（不能把焦点放到背后的页面）', () => {
    root.textContent = 'loading...';
    const release = focusTrap(root);

    const event = pressTab();
    expect(event.defaultPrevented).toBe(true);

    release();
  });
});

describe('focusTrap：解除时必须把焦点还回去', () => {
  it('回到激活前的元素', () => {
    const trigger = button('trigger');
    document.body.appendChild(trigger);
    trigger.focus();

    const inner = button('inner');
    root.appendChild(inner);

    const release = focusTrap(root);
    expect(document.activeElement).toBe(inner);

    release();
    expect(document.activeElement).toBe(trigger);

    trigger.remove();
  });

  it('`restoreFocus: false` 时不还焦点', () => {
    const trigger = button('trigger');
    document.body.appendChild(trigger);
    trigger.focus();

    root.appendChild(button('inner'));
    const release = focusTrap(root, { restoreFocus: false });
    release();
    expect(document.activeElement).not.toBe(trigger);

    trigger.remove();
  });
});

describe('focusTrap：Escape', () => {
  it('提供 onEscape 时**不**自动解除陷阱（由调用方在真正关闭后解除）', () => {
    const inner = button('inner');
    root.appendChild(inner);
    let escaped = 0;

    const release = focusTrap(root, { onEscape: () => escaped++ });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(escaped).toBe(1);
    // 陷阱仍在：焦点不会被放出去
    const event = pressTab();
    expect(event.defaultPrevented).toBe(true);

    release();
  });

  it('不提供 onEscape 时默认自行解除', () => {
    root.appendChild(button('inner'));
    const release = focusTrap(root);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    // 已解除 ⇒ Tab 不再被拦截
    const event = pressTab();
    expect(event.defaultPrevented).toBe(false);

    release();
  });
});

describe('focusTrap：多个陷阱不得互相抢焦点', () => {
  it('嵌套陷阱只让最上层生效（否则 focusin 会互相拉回、递归爆栈）', () => {
    const outer = document.createElement('div');
    const outerBtn = button('outer');
    outer.appendChild(outerBtn);
    document.body.appendChild(outer);

    const inner = document.createElement('div');
    const innerBtn = button('inner');
    inner.appendChild(innerBtn);
    document.body.appendChild(inner);

    const releaseOuter = focusTrap(outer);
    expect(document.activeElement).toBe(outerBtn);

    let releaseInner: (() => void) | null = null;
    expect(() => {
      releaseInner = focusTrap(inner);
    }).not.toThrow();
    expect(document.activeElement).toBe(innerBtn);

    releaseInner?.();
    // 上层解除后焦点交还给下层
    expect(document.activeElement).toBe(outerBtn);

    releaseOuter();
    outer.remove();
    inner.remove();
  });
});

describe('isHiddenFromAccessibility：沿祖先链判定', () => {
  it('自身 hidden 属性 / inert / aria-hidden', () => {
    const el = button('x');
    expect(isHiddenFromAccessibility(el)).toBe(false);

    el.setAttribute('hidden', '');
    expect(isHiddenFromAccessibility(el)).toBe(true);

    el.removeAttribute('hidden');
    el.setAttribute('inert', '');
    expect(isHiddenFromAccessibility(el)).toBe(true);

    el.removeAttribute('inert');
    el.setAttribute('aria-hidden', 'true');
    expect(isHiddenFromAccessibility(el)).toBe(true);
  });

  it('祖先的 aria-hidden / 内联 display:none 同样生效', () => {
    const wrapper = document.createElement('div');
    const el = button('x');
    wrapper.appendChild(el);
    root.appendChild(wrapper);

    expect(isHiddenFromAccessibility(el)).toBe(false);

    wrapper.setAttribute('aria-hidden', 'true');
    expect(isHiddenFromAccessibility(el)).toBe(true);
    expect(isFocusable(el)).toBe(false);
    expect(getFocusableElements(root)).toEqual([]);

    wrapper.removeAttribute('aria-hidden');
    wrapper.style.display = 'none';
    expect(isFocusable(el)).toBe(false);
  });
});
