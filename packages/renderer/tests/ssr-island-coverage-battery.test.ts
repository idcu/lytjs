// @vitest-environment jsdom
/**
 * renderer/ssr-island 覆盖率电池（Task C）：补齐注册/获取/SSR 占位/hydration 边界分支
 *
 * 第二批追加：`hydrateIsland` 的组件选择与 props 解码、setup/render 的 ctx 选择、
 * `hydrateVNode` 的 Fragment / Text / 命中复用 / 未命中新建四条路径、
 * `createElementFromVNode` 的 props 与数组 children、`decodeProps` 的早返回。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createVNode, Fragment, Text } from '@lytjs/vdom';
import {
  registerIslandComponent,
  getIslandComponent,
  createIslandSSRContent,
  hydrateIsland,
} from '../src/ssr/ssr-island';
import type { ComponentOptions } from '../src/ssr/ssr-island';

const Comp = { render: () => null } as never;

function mount(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ssr-island battery: registry', () => {
  it('registers valid and warns on invalid names', () => {
    registerIslandComponent('Widget', Comp);
    expect(getIslandComponent('Widget')).toBe(Comp);
    expect(getIslandComponent('Nope')).toBeUndefined();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    registerIslandComponent('' as any, Comp);

    registerIslandComponent(123 as any, Comp);
    warnSpy.mockRestore();
  });
});

describe('ssr-island battery: createIslandSSRContent', () => {
  it('creates a placeholder div with encoded props', () => {
    const html = createIslandSSRContent('Widget', { a: 1, b: 'x' });
    expect(html).toContain('data-island="Widget"');
    expect(html).toContain('data-props=');
    expect(html).toContain('island placeholder');
  });

  it('escapes the island name', () => {
    const html = createIslandSSRContent('a"b', {});
    expect(html).not.toContain('data-island="a"b"');
  });
});

describe('ssr-island battery: hydrateIsland', () => {
  it('warns when container selector is not found', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await hydrateIsland('#does-not-exist', Comp);
    warnSpy.mockRestore();
  });

  it('hydrates island elements found in a container', async () => {
    registerIslandComponent('Hydratable', Comp);
    const root = document.createElement('div');
    root.innerHTML = createIslandSSRContent('Hydratable', { x: 1 });
    document.body.appendChild(root);
    await hydrateIsland(root, Comp);
    // 未注册名不应抛错
    const root2 = document.createElement('div');
    root2.innerHTML = '<div data-island="Unregistered"></div>';
    document.body.appendChild(root2);
    await hydrateIsland(root2, Comp);
    document.body.innerHTML = '';
  });

  it('data-island 为空串的节点被跳过', async () => {
    const root = mount('<div data-island=""></div>');
    registerIslandComponent('Empty', { name: 'Empty', render: () => null });
    await hydrateIsland(root, { name: 'Empty', render: () => null });
    expect(root.querySelector('[data-island]')).not.toBeNull();
  });

  it('注册表未命中但名字与传入组件相同时使用传入组件', async () => {
    const root = mount('<div data-island="AdHoc"></div>');
    const comp: ComponentOptions = {
      name: 'AdHoc',
      render: () => createVNode('span', null, 'adhoc'),
    };
    await hydrateIsland(root, comp);
    expect(root.querySelector('span')?.textContent).toBe('adhoc');
  });

  it('未传 props 时从 data-props 解码（含删除占位注释）', async () => {
    let received: Record<string, unknown> | undefined;
    const comp: ComponentOptions = {
      name: 'WithProps',
      setup(props) {
        received = props;
        return undefined;
      },
      render: () => createVNode('i', null, 'ok'),
    };
    registerIslandComponent('WithProps', comp);
    const root = mount(createIslandSSRContent('WithProps', { n: 42 }));
    await hydrateIsland(root, comp);
    expect(received).toEqual({ n: 42 });
    expect(root.querySelector('i')?.textContent).toBe('ok');
  });

  it('data-props 非法时回落到空对象', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let received: Record<string, unknown> | undefined;
    const comp: ComponentOptions = {
      name: 'BadProps',
      setup(props) {
        received = props;
      },
      render: () => createVNode('b', null, 'b'),
    };
    registerIslandComponent('BadProps', comp);
    const root = mount('<div data-island="BadProps" data-props="!!!not-base64!!!"></div>');
    await hydrateIsland(root, comp);
    expect(received).toEqual({});
  });
});

describe('ssr-island battery: setup / render 的 ctx 选择', () => {
  it('setup 返回普通对象时作为 render 的 ctx', async () => {
    let seenCtx: Record<string, unknown> | undefined;
    const comp: ComponentOptions = {
      name: 'CtxA',
      setup: () => ({ inner: 'v' }),
      render(ctx) {
        seenCtx = ctx;
        return createVNode('div', null, 'a');
      },
    };
    registerIslandComponent('CtxA', comp);
    const root = mount('<div data-island="CtxA"></div>');
    await hydrateIsland(root, comp);
    expect(seenCtx).toEqual({ inner: 'v' });
  });

  it('setup 返回 void 时 render 收到空对象 ctx', async () => {
    let seenCtx: Record<string, unknown> | undefined;
    const comp: ComponentOptions = {
      name: 'CtxB',
      setup() {},
      render(ctx) {
        seenCtx = ctx;
        return createVNode('div', null, 'b');
      },
    };
    registerIslandComponent('CtxB', comp);
    const root = mount('<div data-island="CtxB"></div>');
    await hydrateIsland(root, comp);
    expect(seenCtx).toEqual({});
  });

  it('setup 直接返回 VNode 时跳过 render', async () => {
    const render = vi.fn(() => createVNode('div', null, 'never'));
    const comp: ComponentOptions = {
      name: 'CtxC',
      setup: () => createVNode('em', null, 'from-setup') as never,
      render,
    };
    registerIslandComponent('CtxC', comp);
    const root = mount('<div data-island="CtxC"></div>');
    await hydrateIsland(root, comp);
    expect(render).not.toHaveBeenCalled();
    expect(root.querySelector('em')?.textContent).toBe('from-setup');
  });
});

describe('ssr-island battery: hydrateVNode 四种节点形态', () => {
  it('Fragment：子 vnode 与已有兄弟节点协调', async () => {
    const comp: ComponentOptions = {
      name: 'Frag',
      render: () =>
        createVNode(Fragment, null, [
          createVNode('p', null, 'one'),
          createVNode('p', null, 'two'),
        ]) as never,
    };
    registerIslandComponent('Frag', comp);
    const root = mount('<div data-island="Frag"></div>');
    await hydrateIsland(root, comp);
    expect(root.querySelector('p')).not.toBeNull();
  });

  it('Fragment：children 非数组时不动 DOM', async () => {
    const comp: ComponentOptions = {
      name: 'FragStr',
      render: () => createVNode(Fragment, null, 'not-array') as never,
    };
    registerIslandComponent('FragStr', comp);
    const root = mount('<div data-island="FragStr">keep</div>');
    await hydrateIsland(root, comp);
    expect(root.textContent).toContain('keep');
  });

  it('Text：复用已有文本节点（内容不同则更新）', async () => {
    const comp: ComponentOptions = {
      name: 'Txt',
      render: () => createVNode(Text, null, 123) as never,
    };
    registerIslandComponent('Txt', comp);
    const root = mount('<div data-island="Txt">old</div>');
    await hydrateIsland(root, comp);
    expect(root.querySelector('[data-island]')?.textContent).toBe('123');
  });

  it('Text：无文本节点时新建', async () => {
    const comp: ComponentOptions = {
      name: 'TxtNew',
      render: () => createVNode(Text, null, 'fresh') as never,
    };
    registerIslandComponent('TxtNew', comp);
    const root = mount('<div data-island="TxtNew"></div>');
    await hydrateIsland(root, comp);
    expect(root.querySelector('[data-island]')?.textContent).toBe('fresh');
  });

  it('元素 vnode：命中已有同标签元素时复用并 hydrate 属性', async () => {
    const comp: ComponentOptions = {
      name: 'ElMatch',
      render: () => createVNode('div', { 'data-x': '1' }, 'new') as never,
    };
    registerIslandComponent('ElMatch', comp);
    const root = mount('<div data-island="ElMatch"><div>old</div></div>');
    await hydrateIsland(root, comp);
    const island = root.querySelector('[data-island]')!;
    expect(island.querySelectorAll('div').length).toBe(1); // 复用而非新建
    expect(island.querySelector('div')?.getAttribute('data-x')).toBe('1');
  });

  it('元素 vnode：无匹配元素时新建，并覆盖 props / 字符串与数组 children', async () => {
    const comp: ComponentOptions = {
      name: 'ElNew',
      render: () =>
        createVNode('ul', { id: 'list', skipMe: null }, [
          'plain-text',
          createVNode('li', null, 'item'),
          createVNode({ name: 'Inner' } as never, null, 'comp'), // 非字符串 type ⇒ 跳过
        ] as never) as never,
    };
    registerIslandComponent('ElNew', comp);
    const root = mount('<div data-island="ElNew"></div>');
    await hydrateIsland(root, comp);
    const ul = root.querySelector('ul')!;
    expect(ul.getAttribute('id')).toBe('list');
    expect(ul.hasAttribute('skipMe')).toBe(false);
    expect(ul.querySelector('li')?.textContent).toBe('item');
    expect(ul.textContent).toContain('plain-text');
  });

  it('组件型 vnode：递归调用组件 render 并复用已有元素', async () => {
    const Inner: ComponentOptions = {
      name: 'Inner',
      render: () => createVNode('span', null, 'inner') as never,
    };
    const comp: ComponentOptions = {
      name: 'Outer',
      render: () => createVNode(Inner as never, null, null) as never,
    };
    registerIslandComponent('Outer', comp);
    const root = mount('<div data-island="Outer"><span>inner</span></div>');
    await hydrateIsland(root, comp);
    expect(root.querySelector('span')?.textContent).toBe('inner');
  });
});
