/**
 * @vitest-environment jsdom
 *
 * @lytjs/adapter-web 事件修饰符语义回归（2026-11-03）
 *
 * invoker 缓存的前提是「缓存的假设与真实监听状态一致」。一旦不一致，
 * 故障全是**静默不触发**：`.once` 更新后点击失效、修饰符更新不生效、
 * `.self` 把子元素事件也 stop 掉。
 *
 * 对应门禁：`scripts/check-event-semantics.mjs`（两套实现 34 条断言）。
 */
import { describe, it, expect } from 'vitest';
import { patchEvent, removeAllEventListeners } from '../src/web-patch-events';

function el(): HTMLDivElement {
  return document.createElement('div');
}

function click(node: Element): void {
  node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

describe('patchEvent 修饰符语义', () => {
  it('.self：子元素点击不触发 handler，也不阻止冒泡', () => {
    const outer = el();
    const mid = el();
    const inner = el();
    outer.appendChild(mid);
    mid.appendChild(inner);

    let outerHit = 0;
    outer.addEventListener('click', () => outerHit++);
    let handlerHit = 0;
    patchEvent(mid, 'onClick.self.stop', () => handlerHit++);

    click(inner);
    expect(handlerHit).toBe(0);
    // 关键：self 不匹配时**不能** stopPropagation
    expect(outerHit).toBe(1);

    click(mid);
    expect(handlerHit).toBe(1);
    expect(outerHit).toBe(1);
  });

  it('.once 更新 handler 后重新武装（此前第二次点击永不触发）', () => {
    const node = el();
    let a = 0;
    let b = 0;

    patchEvent(node, 'onClick.once', () => a++);
    click(node);
    patchEvent(node, 'onClick.once', () => b++);
    click(node);

    expect(a).toBe(1);
    expect(b).toBe(1);
  });

  it('修饰符从 click 改成 click.stop 后生效', () => {
    const outer = el();
    const node = el();
    outer.appendChild(node);
    let outerHit = 0;
    outer.addEventListener('click', () => outerHit++);

    patchEvent(node, 'onClick', () => {});
    patchEvent(node, 'onClick.stop', () => {});
    click(node);

    expect(outerHit).toBe(0);
  });

  it('值对象 {once:true} 改成普通值后 once 取消', () => {
    const node = el();
    let n = 0;

    patchEvent(node, 'onClick', { handler: () => n++, once: true } as never);
    patchEvent(node, 'onClick', { handler: () => n++ } as never);
    click(node);
    click(node);

    expect(n).toBe(2);
  });

  it('removeAllEventListeners 后不再触发', () => {
    const node = el();
    let n = 0;
    patchEvent(node, 'onClick', () => n++);
    removeAllEventListeners(node);
    click(node);
    expect(n).toBe(0);
  });

  it('普通更新只换 handler，不会重复绑定', () => {
    const node = el();
    let first = 0;
    let second = 0;
    patchEvent(node, 'onClick', () => first++);
    patchEvent(node, 'onClick', () => second++);
    click(node);
    expect([first, second]).toEqual([0, 1]);
  });
});
