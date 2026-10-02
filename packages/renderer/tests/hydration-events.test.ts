// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createVNode } from '@lytjs/vdom';
import { hydrateVNode } from '../src/ssr/ssr-island';

/**
 * 造一个「SSR 已产出 HTML」的容器 —— 判据必须是**真实 DOM**，
 * 不能只断言 vnode 形状。
 */
function ssrContainer(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

function click(el: Element): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('hydrateVNode —— 事件与属性水合', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    delete (window as unknown as Record<string, unknown>).__ssrClicks;
  });

  it('★ 水合后 onClick 必须可用：点击应触发 vnode 上的 handler', () => {
    const container = ssrContainer('<button>click</button>');
    let clicks = 0;
    hydrateVNode(
      container,
      createVNode(
        'button',
        {
          onClick: () => {
            clicks++;
          },
        },
        'click',
      ),
    );

    click(container.querySelector('button')!);
    expect(clicks).toBe(1);
  });

  it('事件监听器不得退化为 DOM 属性（不应留下生效的 onclick）', () => {
    const container = ssrContainer('<button>click</button>');
    hydrateVNode(container, createVNode('button', { onClick: () => {} }, 'click'));

    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn.hasAttribute('onclick')).toBe(false);
    expect(btn.onclick).toBeNull();
  });

  it('SSR 内联的 on* 属性应被移除，避免与真实监听器双触发', () => {
    const container = ssrContainer(
      '<button onclick="window.__ssrClicks = (window.__ssrClicks || 0) + 1">x</button>',
    );
    let clicks = 0;
    hydrateVNode(
      container,
      createVNode(
        'button',
        {
          onClick: () => {
            clicks++;
          },
        },
        'x',
      ),
    );

    const btn = container.querySelector('button')!;
    expect(btn.hasAttribute('onclick')).toBe(false);

    click(btn);
    expect(clicks).toBe(1);
    expect((window as unknown as Record<string, unknown>).__ssrClicks).toBeUndefined();
  });

  it('二次水合替换 handler 时应替换而非叠加（invoker 复用）', () => {
    const container = ssrContainer('<button>x</button>');
    let first = 0;
    let second = 0;

    hydrateVNode(
      container,
      createVNode(
        'button',
        {
          onClick: () => {
            first++;
          },
        },
        'x',
      ),
    );
    hydrateVNode(
      container,
      createVNode(
        'button',
        {
          onClick: () => {
            second++;
          },
        },
        'x',
      ),
    );

    click(container.querySelector('button')!);
    expect(first).toBe(0);
    expect(second).toBe(1);
  });

  it('camelCase 属性（tabIndex）在水合后不得被误删', () => {
    const container = ssrContainer('<div>x</div>');
    hydrateVNode(container, createVNode('div', { tabIndex: 3 }, 'x'));

    const el = container.querySelector('div')!;
    const matched = Array.from(el.attributes).find((a) => a.name.toLowerCase() === 'tabindex');
    expect(matched).toBeDefined();
    expect(matched!.value).toBe('3');
  });

  it(':class 传对象时应由渲染器语义展开，而不是被 String() 成 [object Object]', () => {
    const container = ssrContainer('<div>x</div>');
    hydrateVNode(container, createVNode('div', { class: { active: true, off: false } }, 'x'));

    const el = container.querySelector('div')!;
    expect(el.getAttribute('class')).toBe('active');
  });

  it(':style 传对象时应展开为内联样式，而不是 [object Object]', () => {
    const container = ssrContainer('<div>x</div>');
    hydrateVNode(container, createVNode('div', { style: { color: 'red' } }, 'x'));

    const el = container.querySelector('div') as HTMLElement;
    expect(el.style.color).toBe('red');
    expect(el.getAttribute('style')).not.toContain('[object Object]');
  });

  it('vnode 未声明的既有属性应被移除（原有行为不得回退）', () => {
    const container = ssrContainer('<div data-stale="1">x</div>');
    hydrateVNode(container, createVNode('div', { id: 'k' }, 'x'));

    const el = container.querySelector('div')!;
    expect(el.getAttribute('data-stale')).toBeNull();
    expect(el.getAttribute('id')).toBe('k');
  });
});
