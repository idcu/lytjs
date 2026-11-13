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

describe('移除时复用注册时的实际 options', () => {
  it('★ removeAllEventListeners 后，残留的 capture 监听仍会触发（池化复用）', () => {
    const oldEl = el();
    const nextEl = el();
    const hits: string[] = [];

    patchEvent(oldEl, 'onClick', { handler: () => hits.push('old'), capture: true } as never);
    removeAllEventListeners(oldEl);

    // 释放的 invoker 会被下一个元素从对象池取出复用；若旧元素上的 capture 监听
    // 没被真正移除，点击旧元素就会跑到「新元素」的 handler 上。
    patchEvent(nextEl, 'onClick', () => hits.push('new'));
    click(oldEl);

    // 修复前：移除时只按 _parsed（prop 名修饰符）重建 options，丢掉值对象里的
    // capture:true ⇒ removeEventListener 的 capture 与注册时不匹配 ⇒ 监听残留，
    // 点击已移除监听的旧元素仍会触发（hits === ['new']）。
    expect(hits).toEqual([]);
  });

  it('★ patchEvent(null) 后，残留的 capture 监听仍会触发（池化复用）', () => {
    const oldEl = el();
    const nextEl = el();
    const hits: string[] = [];

    patchEvent(oldEl, 'onClick', { handler: () => hits.push('old'), capture: true } as never);
    patchEvent(oldEl, 'onClick', null);

    patchEvent(nextEl, 'onClick', () => hits.push('new'));
    click(oldEl);

    expect(hits).toEqual([]);
  });
});
