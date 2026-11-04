/**
 * @vitest-environment jsdom
 *
 * 水合（hydration）的**收敛语义**回归（2026-11-04 第二轮）。
 *
 * 与 `scripts/check-hydration.mjs` 的分工：
 * · 门禁跑的是「SSR 产物 → 真实 app 水合」的端到端链路（含组件、响应式、事件）；
 * · 本文件跑的是**渲染器层**的语义，不依赖 SSR 包，因此能把每条规则的边界钉死
 *   （游标认领、资源节点白名单、表单状态保护、Fragment 锚点）。
 *
 * 这四类缺陷的共同点：**没有任何异常**，只是 DOM 与「客户端直接渲染」不一致。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createVNode } from '../src/vnode';
import { createRenderer } from '../src/patch';
import { Fragment } from '@lytjs/common-vnode';
import type { VNode } from '@lytjs/common-vnode';
import { WebRendererHost } from '@lytjs/adapter-web';

afterEach(() => {
  document.body.innerHTML = '';
});

function newContainer(html = ''): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

function makeRenderer() {
  return createRenderer(new WebRendererHost());
}

const el = (tag: string, props: Record<string, unknown> | null, children?: unknown): VNode =>
  createVNode(tag, props, children as never);

describe('游标认领：顺序不一致时收敛到 vnode 顺序', () => {
  it('两个不同标签互换位置 ⇒ 以 vnode 顺序为准', () => {
    const container = newContainer('<div><p>P</p><span>S</span></div>');
    makeRenderer().hydrate(el('div', null, [el('span', null, 'S'), el('p', null, 'P')]), container);

    const div = container.querySelector('div')!;
    expect([...div.children].map((c) => c.tagName.toLowerCase())).toEqual(['span', 'p']);
    expect(div.textContent).toBe('SP');
  });

  it('同标签兄弟前插 ⇒ 新建节点插在游标之前', () => {
    const container = newContainer('<div><b>OLD</b></div>');
    makeRenderer().hydrate(
      el('div', null, [el('b', null, 'NEW'), el('b', null, 'OLD')]),
      container,
    );

    const div = container.querySelector('div')!;
    expect([...div.children].map((c) => c.textContent)).toEqual(['NEW', 'OLD']);
  });

  it('缩进用的空白文本节点可以被跳过（复用不退化）', () => {
    const container = newContainer('<div>\n  <p>a</p>\n  <p>b</p>\n</div>');
    const before = container.querySelector('p');
    makeRenderer().hydrate(el('div', null, [el('p', null, 'a'), el('p', null, 'b')]), container);

    const div = container.querySelector('div')!;
    // 复用：第一个 <p> 还是原来那个节点（不是重建）
    expect(div.querySelector('p')).toBe(before);
    expect(div.childNodes.length).toBe(2);
  });
});

describe('服务端资源节点：不能被当成「多余节点」删掉', () => {
  it('根内的 <script type="application/json"> 保留且内容可读', () => {
    const container = newContainer(
      '<div><p>x</p><script type="application/json">{"token":"abc"}</script></div>',
    );
    makeRenderer().hydrate(el('div', null, [el('p', null, 'x')]), container);

    const script = container.querySelector('script[type="application/json"]');
    expect(script).not.toBeNull();
    expect(JSON.parse(script!.textContent!)).toEqual({ token: 'abc' });
  });

  it('<style> / <noscript> 同样保留', () => {
    const container = newContainer('<div><style>.a{color:red}</style><p>x</p></div>');
    makeRenderer().hydrate(el('div', null, [el('p', null, 'x')]), container);
    expect(container.querySelector('style')).not.toBeNull();

    document.body.innerHTML = '';
    const c2 = newContainer('<div><noscript>需要 JS</noscript><p>x</p></div>');
    makeRenderer().hydrate(el('div', null, [el('p', null, 'x')]), c2);
    expect(c2.querySelector('noscript')).not.toBeNull();
  });

  it('对照：普通多余元素与多余注释仍然被删除', () => {
    const container = newContainer('<div><span class="stale">s</span><p>x</p></div>');
    makeRenderer().hydrate(el('div', null, [el('p', null, 'x')]), container);
    expect(container.querySelector('.stale')).toBeNull();
    expect(container.querySelector('div')!.childNodes.length).toBe(1);

    document.body.innerHTML = '';
    const c2 = newContainer('<div><!--stale--><p>x</p></div>');
    makeRenderer().hydrate(el('div', null, [el('p', null, 'x')]), c2);
    expect(c2.innerHTML).not.toContain('stale');
  });
});

describe('表单状态：用户在 JS 到达之前改过的内容不能被覆盖', () => {
  it('input.value 被用户改过 ⇒ 水合后保留', () => {
    const container = newContainer('<input value="server">');
    const input = container.querySelector('input')!;
    input.value = 'typed by user';

    makeRenderer().hydrate(el('input', { value: 'server' }), container);

    expect(container.querySelector('input')!.value).toBe('typed by user');
  });

  it('复选框被用户勾上 ⇒ 水合后保持勾选', () => {
    const container = newContainer('<input type="checkbox">');
    const box = container.querySelector('input')!;
    box.checked = true;

    makeRenderer().hydrate(el('input', { type: 'checkbox', checked: false }), container);

    expect(container.querySelector('input')!.checked).toBe(true);
  });

  it('下拉框被用户选过 ⇒ 水合后保持选择', () => {
    const container = newContainer(
      '<select><option value="a">A</option><option value="b">B</option></select>',
    );
    container.querySelector('select')!.value = 'b';

    makeRenderer().hydrate(
      el('select', { value: 'a' }, [
        el('option', { value: 'a' }, 'A'),
        el('option', { value: 'b' }, 'B'),
      ]),
      container,
    );

    expect(container.querySelector('select')!.value).toBe('b');
  });

  it('对照：没人动过且两端不同 ⇒ 以 vnode 为准（不能一律跳过）', () => {
    const container = newContainer('<input value="server">');
    makeRenderer().hydrate(el('input', { value: 'client' }), container);
    expect(container.querySelector('input')!.value).toBe('client');
  });
});

describe('多根（Fragment）根节点：容器级收敛与锚点', () => {
  it('SSR 多一个根 ⇒ 残留根被删除', () => {
    const container = newContainer('<p>1</p><p>2</p><p>3</p>');
    makeRenderer().hydrate(
      createVNode(Fragment, null, [el('p', null, '1'), el('p', null, '2')] as never),
      container,
    );

    expect(container.textContent).toBe('12');
    // 只剩两个 <p> + 两个片段锚点
    expect(container.querySelectorAll('p').length).toBe(2);
  });

  it('客户端多一个根 ⇒ 插在片段内（结束锚点之前）', () => {
    const container = newContainer('<p>1</p><p>2</p>');
    makeRenderer().hydrate(
      createVNode(Fragment, null, [
        el('p', null, '1'),
        el('p', null, '2'),
        el('p', null, '3'),
      ] as never),
      container,
    );

    const nodes = [...container.childNodes];
    const last = nodes[nodes.length - 1]!;
    // 最后一个节点是片段结束锚点（注释），第三个 <p> 必须在它之前
    expect(last.nodeType).toBe(8);
    expect(container.querySelectorAll('p').length).toBe(3);
    expect(container.textContent).toBe('123');
  });

  it('片段外的资源节点不被包进片段范围（卸载后仍在）', () => {
    const container = newContainer('<p>1</p><script type="application/json">{"a":1}</script>');
    const renderer = makeRenderer();
    const vnode = createVNode(Fragment, null, [el('p', null, '1')] as never);
    renderer.hydrate(vnode, container);

    expect(container.querySelector('script[type="application/json"]')).not.toBeNull();

    renderer.unmount(vnode, null, null, true);
    expect(container.querySelector('script[type="application/json"]')).not.toBeNull();
    expect(container.querySelector('p')).toBeNull();
  });
});
