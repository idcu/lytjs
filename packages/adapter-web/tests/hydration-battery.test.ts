// @vitest-environment jsdom
/**
 * 行为级判据：`@lytjs/adapter-web` 的**水合**（`src/web-hydration.ts`，480 行、覆盖率 65%）
 *
 * ## 为什么要有这条
 *
 * 水合是**状态机 + DOM 对位**：vnode 与已有 DOM 逐个配对，配不上就替换并告警。
 * 判错的表现不是崩，而是**闪一下内容再跳变**、或者**页面少了一段**。
 *
 * ## 手法
 *
 * 用真 jsdom + 真 `WebRendererHost`，从 `createHydrationFunctions()` 拿到 `hydrate`，
 * 断言三件事：**复用了原节点**（`vnode.el` 指向已有 DOM）、**内容被对齐**、
 * **不匹配时发出告警**（这是水合唯一的问题信号）。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createVNode, Fragment, Text, Comment } from '@lytjs/vdom';
import { createHydrationFunctions } from '../src/web-hydration';

let container: HTMLElement;
let warnSpy: ReturnType<typeof vi.spyOn>;

const hydrate = (vnode: unknown) => {
  const { hydrate: run } = createHydrationFunctions({});
  run(vnode as never, container);
};

beforeEach(() => {
  document.body.innerHTML = '';
  container = document.createElement('div');
  document.body.appendChild(container);
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

// ==================== 文本 ====================

describe('文本水合', () => {
  it('内容一致 ⇒ 复用原文本节点（不新建、不告警）', () => {
    container.appendChild(document.createTextNode('hello'));
    const node = container.childNodes[0]!;

    const vnode = createVNode(Text, null, 'hello');
    hydrate(vnode);

    expect(vnode.el).toBe(node);
    expect(container.childNodes).toHaveLength(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('内容不一致 ⇒ 复用节点但对齐文本，并告警', () => {
    container.appendChild(document.createTextNode('server'));
    const node = container.childNodes[0]!;

    const vnode = createVNode(Text, null, 'client');
    hydrate(vnode);

    expect(vnode.el).toBe(node);
    expect(container.textContent).toBe('client');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('对位是元素节点 ⇒ 替换为新文本节点并告警', () => {
    container.appendChild(document.createElement('span'));

    const vnode = createVNode(Text, null, 'text');
    hydrate(vnode);

    expect(container.childNodes).toHaveLength(1);
    expect(container.firstChild!.nodeType).toBe(Node.TEXT_NODE);
    expect(container.textContent).toBe('text');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('容器里什么都没有 ⇒ 插入文本节点', () => {
    const vnode = createVNode(Text, null, 'fresh');
    hydrate(vnode);

    expect(container.textContent).toBe('fresh');
  });
});

// ==================== 注释（Fragment 锚点靠它） ====================

describe('注释水合', () => {
  it('内容一致 ⇒ 复用原注释节点', () => {
    container.appendChild(document.createComment(''));
    const node = container.childNodes[0]!;

    const vnode = createVNode(Comment, null, '');
    hydrate(vnode);

    expect(vnode.el).toBe(node);
    expect(container.childNodes).toHaveLength(1);
  });

  it('内容不一致 ⇒ 复用节点并改写注释文本', () => {
    container.appendChild(document.createComment('old'));

    hydrate(createVNode(Comment, null, 'new'));

    expect(container.firstChild!.textContent).toBe('new');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('对位是文本节点 ⇒ 替换为注释节点', () => {
    container.appendChild(document.createTextNode('x'));

    hydrate(createVNode(Comment, null, 'anchor'));

    expect(container.firstChild!.nodeType).toBe(Node.COMMENT_NODE);
    expect(container.firstChild!.textContent).toBe('anchor');
  });
});

// ==================== 元素 ====================

describe('元素水合', () => {
  it('标签一致 ⇒ 复用已有元素', () => {
    const existing = document.createElement('div');
    container.appendChild(existing);

    const vnode = createVNode('div', { class: 'box' });
    hydrate(vnode);

    expect(vnode.el).toBe(existing);
    expect(container.childNodes).toHaveLength(1);
  });

  it('标签不一致 ⇒ 换成新元素并告警', () => {
    container.appendChild(document.createElement('span'));

    hydrate(createVNode('div', {}));

    expect(container.firstChild!.nodeName).toBe('DIV');
    expect(container.childNodes).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('嵌套子节点按顺序逐一对位', () => {
    const wrap = document.createElement('div');
    const span = document.createElement('span');
    span.textContent = 'a';
    wrap.appendChild(span);
    wrap.appendChild(document.createTextNode('tail'));
    container.appendChild(wrap);

    const child = createVNode('span', null, 'a');
    hydrate(createVNode('div', null, [child, createVNode(Text, null, 'tail')]));

    expect(container.textContent).toBe('atail');
    expect(child.el).toBe(span);
  });
});

// ==================== 片段 ====================

describe('Fragment 水合', () => {
  it('多根节点按顺序对位到容器的连续子节点', () => {
    container.appendChild(document.createTextNode('a'));
    container.appendChild(document.createTextNode('b'));

    hydrate(
      createVNode(Fragment, null, [createVNode(Text, null, 'a'), createVNode(Text, null, 'b')]),
    );

    expect(container.textContent).toBe('ab');
  });
});

// ==================== 函数式 children ====================

describe('不支持的形态', () => {
  it('文本 vnode 的 children 是函数 ⇒ 退化成空串并告警', () => {
    container.appendChild(document.createTextNode(''));

    hydrate(createVNode(Text, null, (() => 'nope') as never));

    expect(container.textContent).toBe('');
    expect(warnSpy).toHaveBeenCalled();
  });
});

// ==================== 组件 ====================

// ⚠️ 判据必须是「**被纠正了**」而不是「内容对」：如果组件被整体跳过，
//    服务端渲染出来的旧内容原样留在 DOM 里，`textContent` 照样"看起来对"。
//    所以这里让服务端内容与客户端渲染**故意不同**，只有真的水合过才会被改成 client。
describe('组件水合', () => {
  it('★ setup 返回渲染函数（Composition 的标准写法）必须被水合', () => {
    const div = document.createElement('div');
    div.textContent = 'server';
    container.appendChild(div);

    const Comp = { setup: () => () => createVNode('div', null, 'client') };
    const vnode = createVNode(Comp, {});
    hydrate(vnode);

    expect(container.textContent).toBe('client');
    expect(vnode.el).toBeTruthy();
  });

  it('setup 返回对象 + render 选项 ⇒ 用该对象作为 ctx 调用 render', () => {
    const div = document.createElement('div');
    div.textContent = 'server';
    container.appendChild(div);

    const Comp = {
      setup: () => ({ label: 'client' }),
      render: (ctx: { label: string }) => createVNode('div', null, ctx.label),
    };

    hydrate(createVNode(Comp, {}));

    expect(container.textContent).toBe('client');
  });

  it('setup 解构 slots 不会崩（水合期至少要给个空上下文）', () => {
    container.appendChild(document.createElement('div'));

    const Comp = {
      // ⚠️ 第二个参数才是 setup 上下文。第一版写成 `setup({ slots })`（从 **props** 解构），
      //    于是 `slots` 恒为 undefined —— 那是夹具错，不是产品错。
      setup:
        (_props: unknown, { slots }: { slots: Record<string, unknown> }) =>
        () =>
          createVNode('div', null, Object.keys(slots).length === 0 ? 'empty' : 'has'),
    };

    expect(() => hydrate(createVNode(Comp, {}))).not.toThrow();
  });
});
