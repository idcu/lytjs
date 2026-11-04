// @vitest-environment jsdom
/**
 * 水合（hydration）行为回归（2026-11-04）
 *
 * 核心不变量：**`hydrate(ssrHtml)` 之后的 DOM 必须等于「客户端直接渲染」的 DOM**。
 * 这条不变量此前被五个缺陷同时违反，而且**全都不报错**：
 *
 * | # | 缺陷 | 症状 |
 * |---|---|---|
 * | 1 | 客户端新增的节点被追加到末尾 | 顺序错 |
 * | 2 | 服务端独有的节点不被清理 | 脏内容留在页面上 |
 * | 3 | 服务端独有的属性不被清理 | `id` / `title` / `data-*` 残留 |
 * | 4 | 缩进 HTML 的空白文本节点不被清理 | `childNodes` 膨胀 |
 * | 5 | 以上全部静默 | 控制台无输出 |
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, h, ref } from '../src';

// SSR 产物（只用于生成「服务端 HTML」，与客户端渲染做对照）
const { renderToString } =
  await import('../../ecosystem/packages/ssr-kit/packages/ssr/dist/index.mjs');

const hosts: HTMLElement[] = [];

const tick = (ms = 40): Promise<void> => new Promise((r) => setTimeout(r, ms));
const norm = (s: string): string =>
  s
    .replace(/\s+/g, ' ')
    .replace(/<!--[^>]*-->/g, '')
    .trim();

/** 用给定 HTML 做容器，然后水合 */
async function hydrateWith(component: unknown, ssrHtml: string): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = ssrHtml;
  document.body.appendChild(container);
  hosts.push(container);
  await createApp(component as never).mount(container, { hydrate: true });
  await tick();
  return container;
}

/** 对照组：直接挂载（客户端渲染的「正确结果」） */
async function mountOnly(component: unknown): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  hosts.push(container);
  await createApp(component as never).mount(container);
  await tick();
  return container;
}

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
  vi.restoreAllMocks();
});

describe('水合：节点复用', () => {
  it('复用既有 DOM 节点，而不是重新创建', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<div class="root"><p>hi</p></div>';
    document.body.appendChild(container);
    hosts.push(container);

    const originalDiv = container.querySelector('div');
    const originalP = container.querySelector('p');

    await createApp({
      render: () => h('div', { class: 'root' }, [h('p', {}, 'hi')]),
    } as never).mount(container, { hydrate: true });
    await tick();

    expect(container.querySelector('div')).toBe(originalDiv);
    expect(container.querySelector('p')).toBe(originalP);
    expect(container.querySelectorAll('div')).toHaveLength(1);
  });
});

describe('水合：与客户端渲染收敛', () => {
  it('服务端独有的子节点会被移除（此前留在页面上）', async () => {
    const Client = { render: () => h('div', {}, [h('i', {}, 'I')]) };
    const container = await hydrateWith(
      Client,
      '<div><span class="only-server">S</span><i>I</i></div>',
    );
    expect(norm(container.innerHTML)).toBe('<div><i>I</i></div>');
  });

  it('客户端新增的节点插在正确位置（此前追加到末尾）', async () => {
    const Client = {
      render: () => h('div', {}, [h('span', { class: 'new' }, 'N'), h('i', {}, 'I')]),
    };
    const container = await hydrateWith(Client, '<div><i>I</i></div>');
    expect(norm(container.innerHTML)).toBe('<div><span class="new">N</span><i>I</i></div>');
  });

  it('服务端独有的属性会被清理（此前 id / title / data-* 全部残留）', async () => {
    const Client = { render: () => h('div', {}, ['x']) };
    const container = await hydrateWith(Client, '<div id="srv" title="T" data-x="1">x</div>');
    expect(norm(container.innerHTML)).toBe('<div>x</div>');
  });

  it('缩进 HTML 的空白文本节点会被清理', async () => {
    const Client = { render: () => h('div', {}, [h('p', {}, 'a'), h('p', {}, 'b')]) };
    const container = await hydrateWith(Client, '<div>\n  <p>a</p>\n  <p>b</p>\n</div>');
    expect(container.querySelector('div')!.childNodes).toHaveLength(2);
  });

  it('文本 vnode 不会认领「缩进用的空白节点」', async () => {
    const Client = { render: () => h('div', {}, ['hello', h('p', {}, 'p')]) };
    const container = await hydrateWith(Client, '<div>\n  hello\n  <p>p</p>\n</div>');
    const root = container.querySelector('div')!;
    expect(root.childNodes).toHaveLength(2);
    expect(norm(container.innerHTML)).toBe('<div>hello<p>p</p></div>');
  });

  it('文本内容不一致时以客户端为准', async () => {
    const Client = { render: () => h('div', {}, [h('p', {}, 'client')]) };
    const container = await hydrateWith(Client, '<div><p>server</p></div>');
    expect(norm(container.innerHTML)).toBe('<div><p>client</p></div>');
  });

  it('水合结果与「客户端直接渲染」逐字一致（多种形态）', async () => {
    const shapes = [
      { render: () => h('div', { class: 'a' }, [h('p', {}, 'hi'), h('span', {}, 'x')]) },
      {
        render: () =>
          h(
            'ul',
            {},
            [1, 2, 3].map((i) => h('li', { key: i }, String(i))),
          ),
      },
      { render: () => [h('p', {}, '1'), h('p', {}, '2')] },
      {
        render: () =>
          h('div', {}, [
            h('header', {}, [h('h1', {}, 'T')]),
            h(
              'ul',
              {},
              [1, 2].map((i) => h('li', { key: i }, [h('span', {}, String(i))])),
            ),
          ]),
      },
    ];
    for (const shape of shapes) {
      const ssrHtml = renderToString(h(shape as never) as never);
      const hydrated = await hydrateWith(shape, ssrHtml);
      const mounted = await mountOnly(shape);
      expect(norm(hydrated.innerHTML)).toBe(norm(mounted.innerHTML));
    }
  });
});

describe('水合：表单状态不能被重置', () => {
  it('input 的 value 保留', async () => {
    const value = ref('hello');
    const container = await hydrateWith(
      { render: () => h('input', { value: value.value }) },
      '<input value="hello">',
    );
    const input = container.querySelector('input')!;
    expect(input.value).toBe('hello');
    expect(input.getAttribute('value')).toBe('hello');
  });
});

describe('水合：接管能力', () => {
  it('事件监听生效 + 响应式更新接管', async () => {
    const n = ref(0);
    const container = await hydrateWith(
      { render: () => h('button', { onClick: () => n.value++ }, String(n.value)) },
      '<button>0</button>',
    );
    const btn = container.querySelector('button')!;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(btn.textContent).toBe('1');

    n.value = 5;
    await tick();
    expect(btn.textContent).toBe('5');
  });
});

describe('水合：mismatch 要留痕（dev）', () => {
  it('服务端缺节点时给出告警', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await hydrateWith({ render: () => h('div', {}, [h('span', {}, 'N')]) }, '<div></div>');
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages.some((m) => m.includes('Hydration mismatch'))).toBe(true);
  });

  it('服务端多节点时给出告警', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await hydrateWith({ render: () => h('div', {}, []) }, '<div><b>extra</b></div>');
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages.some((m) => m.includes('Hydration mismatch'))).toBe(true);
  });
});
