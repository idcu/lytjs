// @vitest-environment jsdom
/**
 * `vdom/src/patch.ts` 行为电池。
 *
 * 该文件此前 **141/423 语句未覆盖（67%）** —— 它是所有 vnode 类型的分发中枢，
 * 未覆盖的是几条**边界但真实**的分支：legacy options 适配、事件清理注册表、
 * 组件更新的「跳过」判定、卸载时的 ref 清理、Fragment move、hydrate 退化。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createVNode, createTextVNode, createCommentVNode } from '../src/vnode';
import { createRenderer } from '../src/patch';
import { registerEventCleanupCallback } from '../src/patch';
import { Fragment } from '@lytjs/common-vnode';
import type { VNode } from '@lytjs/common-vnode';
import { WebRendererHost } from '@lytjs/adapter-web';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

function newContainer(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

function makeRenderer(): ReturnType<typeof createRenderer> {
  return createRenderer(new WebRendererHost());
}

describe('createRenderer 的两条适配路径', () => {
  it('返回 patch / mount / hydrate / unmount / move / diffChildren', () => {
    const r = makeRenderer();

    for (const k of ['patch', 'mount', 'hydrate', 'unmount', 'move', 'diffChildren'] as const) {
      expect(typeof r[k]).toBe('function');
    }
  });

  it('★ legacy RendererOptions（无 __isRendererHost 标记）同样能挂载', () => {
    // 覆盖 optionsToInternal：不走 host 适配器，直接用扁平的 options 对象
    const container = newContainer();
    const renderer = createRenderer({
      createElement: (tag: string) => document.createElement(tag),
      setElementText: (el: Element, text: string) => {
        el.textContent = text;
      },
      insert: (child: Node, parent: Node, anchor?: Node | null) => {
        parent.insertBefore(child, anchor ?? null);
      },
      remove: (child: Node) => child.parentNode?.removeChild(child),
      createText: (text: string) => document.createTextNode(text),
      setText: (node: Node, text: string) => {
        node.textContent = text;
      },
      patchProp: (el: Element, key: string, _prev: unknown, next: unknown) => {
        if (key === 'id') (el as HTMLElement).id = String(next);
      },
      createComment: (text: string) => document.createComment(text),
      nextSibling: (node: Node) => node.nextSibling,
      parentNode: (node: Node) => node.parentNode,
    } as never);

    renderer.mount(createVNode('div', { id: 'legacy' }, 'x'), container);

    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe('DIV');
    expect(el.id).toBe('legacy');
    expect(el.textContent).toBe('x');
  });

  it('legacy options 缺省 querySelector 时不抛错', () => {
    const container = newContainer();
    const renderer = createRenderer({
      createElement: (tag: string) => document.createElement(tag),
      setElementText: (el: Element, text: string) => {
        el.textContent = text;
      },
      insert: (child: Node, parent: Node, anchor?: Node | null) => {
        parent.insertBefore(child, anchor ?? null);
      },
      remove: (child: Node) => child.parentNode?.removeChild(child),
      createText: (text: string) => document.createTextNode(text),
      setText: (node: Node, text: string) => {
        node.textContent = text;
      },
      patchProp: () => {},
      createComment: (text: string) => document.createComment(text),
      nextSibling: (node: Node) => node.nextSibling,
      parentNode: (node: Node) => node.parentNode,
    } as never);

    expect(() => renderer.mount(createVNode('span', null, 'ok'), container)).not.toThrow();
  });

  it('★ 同一个 host 对象重复创建渲染器 ⇒ DEV 警告（防隔离问题）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const host = new WebRendererHost();

    createRenderer(host);
    createRenderer(host);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('already been created'));
  });
});

describe('patch 的边界', () => {
  it('★ patch(null, null) 不抛错、给出警告、容器不变', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const container = newContainer();
    const renderer = makeRenderer();

    expect(() => renderer.patch(null, null as unknown as VNode, container)).not.toThrow();
    expect(warn).toHaveBeenCalled();
    expect(container.childNodes.length).toBe(0);
  });

  it('Text vnode 的 children 变化 ⇒ 更新文本节点', () => {
    const container = newContainer();
    const renderer = makeRenderer();
    const n1 = createTextVNode('a');
    renderer.mount(n1, container);

    const n2 = createTextVNode('b');
    renderer.patch(n1, n2, container);

    expect(container.textContent).toBe('b');
    expect(n2.el).toBe(n1.el);
  });

  it('Comment vnode 的 children 变化 ⇒ 更新注释节点', () => {
    const container = newContainer();
    const renderer = makeRenderer();
    const n1 = createCommentVNode('c1');
    renderer.mount(n1, container);

    const n2 = createCommentVNode('c2');
    renderer.patch(n1, n2, container);

    expect((container.firstChild as Comment).data).toBe('c2');
  });

  it('★ Text vnode 收到函数 children ⇒ 警告并置为空串（不写入函数源码）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const container = newContainer();
    const renderer = makeRenderer();
    const n1 = createTextVNode('a');
    renderer.mount(n1, container);

    const n2 = createTextVNode('a');
    (n2 as unknown as { children: unknown }).children = () => 'fn';

    renderer.patch(n1, n2, container);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Function children'));
    expect(container.textContent).toBe('');
  });
});

describe('组件 patch 的更新判定', () => {
  // ⚠️ type 必须是**同一个对象**：`isSameVNodeType` 比较 type 引用，
  //    每次新建 `{ name: 'Comp' }` 会被判为不同类型 ⇒ 走「卸载 + 挂载」而不是 patch。
  const Comp = { name: 'Comp', render: () => null };

  function makeComponentVNode(
    props: Record<string, unknown> | null,
    children: unknown = null,
  ): VNode {
    return createVNode(Comp as never, props, children as never);
  }

  function makeInstance(overrides: Record<string, unknown> = {}) {
    return {
      update: vi.fn(),
      props: {},
      type: { name: 'Comp' },
      ...overrides,
    };
  }

  it('props 变化 ⇒ 调用 update', () => {
    const container = newContainer();
    const renderer = makeRenderer();
    const instance = makeInstance();
    const n1 = makeComponentVNode({ a: 1 });
    (n1 as unknown as { component: unknown }).component = instance;
    n1.el = document.createElement('div');

    const n2 = makeComponentVNode({ a: 2 });
    renderer.patch(n1, n2, container);

    expect(instance.update).toHaveBeenCalledTimes(1);
    expect(n2.component).toBe(instance);
    expect(n2.el).toBe(n1.el);
  });

  it('★ props 与 slots 都没变 ⇒ 不调用 update，并给出「跳过」提示', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const container = newContainer();
    const renderer = makeRenderer();
    const instance = makeInstance();
    const n1 = makeComponentVNode({ a: 1 });
    (n1 as unknown as { component: unknown }).component = instance;
    n1.el = document.createElement('div');

    const n2 = makeComponentVNode({ a: 1 });
    renderer.patch(n1, n2, container);

    expect(instance.update).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('跳过组件更新'));
  });

  it('★ slots（children）变化时即使 props 相同也要 update', () => {
    const container = newContainer();
    const renderer = makeRenderer();
    const instance = makeInstance();
    const n1 = makeComponentVNode({ a: 1 }, null);
    (n1 as unknown as { component: unknown }).component = instance;
    n1.el = document.createElement('div');

    const n2 = makeComponentVNode({ a: 1 }, { default: () => [] });
    renderer.patch(n1, n2, container);

    expect(instance.update).toHaveBeenCalledTimes(1);
  });

  it('host 路径没有 normalizeProps ⇒ 回退为直接赋值 props', () => {
    const container = newContainer();
    const renderer = makeRenderer();
    const instance = makeInstance();
    const n1 = makeComponentVNode({ a: 1 });
    (n1 as unknown as { component: unknown }).component = instance;
    n1.el = document.createElement('div');

    const n2 = makeComponentVNode({ a: 2 });
    renderer.patch(n1, n2, container);

    expect(instance.props).toEqual({ a: 2 });
  });

  it('legacy options 提供 normalizeProps ⇒ 走规范化回调而不是直接赋值', () => {
    const container = newContainer();
    const normalizeProps = vi.fn();
    const renderer = createRenderer({
      createElement: (tag: string) => document.createElement(tag),
      setElementText: () => {},
      insert: () => {},
      remove: () => {},
      createText: () => document.createTextNode(''),
      setText: () => {},
      patchProp: () => {},
      createComment: () => document.createComment(''),
      nextSibling: (node: Node) => node.nextSibling,
      parentNode: (node: Node) => node.parentNode,
      normalizeProps,
    } as never);

    const instance = makeInstance();
    const n1 = makeComponentVNode({ a: 1 });
    (n1 as unknown as { component: unknown }).component = instance;
    n1.el = document.createElement('div');

    renderer.patch(n1, makeComponentVNode({ a: 2 }), container);

    expect(normalizeProps).toHaveBeenCalledWith(instance, { a: 2 });
  });
});

describe('卸载时的清理', () => {
  it('★ 注册的事件清理回调在元素卸载时被调用', () => {
    const container = newContainer();
    const renderer = makeRenderer();
    const cleanup = vi.fn();
    const off = registerEventCleanupCallback(cleanup);

    const vnode = createVNode('div', null, 'x');
    renderer.mount(vnode, container);
    renderer.unmount(vnode);

    off();

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledWith(vnode.el);
  });

  it('注销后不再被调用', () => {
    const container = newContainer();
    const renderer = makeRenderer();
    const cleanup = vi.fn();
    const off = registerEventCleanupCallback(cleanup);
    off();

    const vnode = createVNode('div', null, 'x');
    renderer.mount(vnode, container);
    renderer.unmount(vnode);

    expect(cleanup).not.toHaveBeenCalled();
  });

  it('★ 某个清理回调抛错不影响其它回调，也不冒泡', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const container = newContainer();
    const renderer = makeRenderer();
    const good = vi.fn();
    const offBad = registerEventCleanupCallback(() => {
      throw new Error('cleanup-boom');
    });
    const offGood = registerEventCleanupCallback(good);

    const vnode = createVNode('div', null, 'x');
    renderer.mount(vnode, container);
    expect(() => renderer.unmount(vnode)).not.toThrow();

    offBad();
    offGood();

    expect(good).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
  });

  it('★ string ref 在卸载时从父组件的 refs 中删除', () => {
    const container = newContainer();
    const renderer = makeRenderer();
    const parent = { refs: { box: null } as Record<string, unknown> } as never;

    const n1 = createVNode('div', { ref: 'box' });
    renderer.mount(n1, container);
    (parent as unknown as { refs: Record<string, unknown> }).refs.box = n1.el;

    // 换成不同类型 ⇒ 走 unmount 分支
    renderer.patch(n1, createVNode('span'), container, null, parent);

    expect((parent as unknown as { refs: Record<string, unknown> }).refs).not.toHaveProperty('box');
  });

  it('function ref 在卸载时收到 null', () => {
    const container = newContainer();
    const renderer = makeRenderer();
    const parent = { refs: {} } as never;
    const refFn = vi.fn();

    const n1 = createVNode('div', { ref: refFn });
    renderer.mount(n1, container);

    renderer.patch(n1, createVNode('span'), container, null, parent);

    expect(refFn).toHaveBeenCalledWith(null);
  });

  it('object ref 在卸载时 .value 置 null', () => {
    const container = newContainer();
    const renderer = makeRenderer();
    const parent = { refs: {} } as never;
    const refObj = { value: 'something' as unknown };

    const n1 = createVNode('div', { ref: refObj });
    renderer.mount(n1, container);

    renderer.patch(n1, createVNode('span'), container, null, parent);

    expect(refObj.value).toBeNull();
  });
});

describe('move', () => {
  it('普通元素被移动到新容器', () => {
    const from = newContainer();
    const to = newContainer();
    const renderer = makeRenderer();
    const vnode = createVNode('div', null, 'x');
    renderer.mount(vnode, from);

    renderer.move(vnode, to, null, null, null);

    expect(from.childNodes.length).toBe(0);
    expect(to.firstChild).toBe(vnode.el);
  });

  it('★ Fragment 移动时子节点与锚点一起移动', () => {
    const from = newContainer();
    const to = newContainer();
    const renderer = makeRenderer();
    const vnode = createVNode(Fragment, null, [createVNode('i'), createVNode('b')]);
    renderer.mount(vnode, from);

    const before = from.childNodes.length;
    expect(before).toBeGreaterThanOrEqual(2);

    renderer.move(vnode, to, null, null, null);

    expect(from.childNodes.length).toBe(0);
    expect(to.textContent).toBe('');
    expect(to.querySelectorAll('i').length).toBe(1);
    expect(to.querySelectorAll('b').length).toBe(1);
  });
});

describe('hydrate', () => {
  it('★ host 缺少水合能力 ⇒ 告警并退化为普通挂载', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const container = newContainer();
    const renderer = createRenderer({
      createElement: (tag: string) => document.createElement(tag),
      setElementText: (el: Element, text: string) => {
        el.textContent = text;
      },
      insert: (child: Node, parent: Node, anchor?: Node | null) => {
        parent.insertBefore(child, anchor ?? null);
      },
      remove: (child: Node) => child.parentNode?.removeChild(child),
      createText: (text: string) => document.createTextNode(text),
      setText: (node: Node, text: string) => {
        node.textContent = text;
      },
      patchProp: () => {},
      createComment: (text: string) => document.createComment(text),
      nextSibling: (node: Node) => node.nextSibling,
      parentNode: (node: Node) => node.parentNode,
    } as never);

    expect(() => renderer.hydrate(createVNode('div', null, 'x'), container)).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('hydrate() requires'));
    expect(container.textContent).toBe('x');
  });

  it('正常水合后仍可继续 patch（状态已复位）', () => {
    const container = newContainer();
    container.innerHTML = '<div>ssr</div>';
    const renderer = makeRenderer();

    const vnode = createVNode('div', null, 'ssr');
    renderer.hydrate(vnode, container);
    expect(container.textContent).toBe('ssr');

    // 水合结束后 ctx.hydrating 必须复位，否则后续挂载会去「认领」已有节点
    renderer.patch(vnode, createVNode('div', null, 'updated'), container);
    expect(container.textContent).toBe('updated');
  });
});
