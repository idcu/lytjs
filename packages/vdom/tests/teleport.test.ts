// @vitest-environment jsdom
/**
 * Tests for Teleport operations
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createVNode, createRenderer, ShapeFlags } from '../src/index';
import { WebRendererHost } from '@lytjs/adapter-web';

let targetCounter = 0;

function createUniqueTarget(): HTMLDivElement {
  const el = document.createElement('div');
  el.id = `teleport-target-${++targetCounter}`;
  document.body.appendChild(el);
  return el;
}

function createTestContainer(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

/**
 * legacy options 渲染器：注入最小组件实例与 mounted/unmounted 计数。
 * （`createRenderer(host)` 不接受这些回调，见 hostToOptions。）
 */
function createCountingRenderer(counters: { mounted: number; unmounted: number }) {
  return createRenderer({
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
    querySelector: (selector: string) => document.querySelector(selector),
    nextSibling: (node: Node) => node.nextSibling,
    parentNode: (node: Node) => node.parentNode,
    setupChildComponent: (vnode: any, parent: any) => {
      const type = vnode.type as { render: (ctx: object) => unknown };
      vnode.component = {
        type,
        render: type.render,
        ctx: {},
        parent,
        root: null,
        subTree: null,
        vnode,
        refs: {},
        attrs: null,
        props: {},
      };
    },
    invokeMountedHook: () => {
      counters.mounted++;
    },
    invokeUnmountedHook: () => {
      counters.unmounted++;
    },
  } as never);
}

describe('Teleport - mount', () => {
  let container: HTMLDivElement;
  let target: HTMLDivElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = createTestContainer();
    target = createUniqueTarget();
    renderer = createRenderer(new WebRendererHost());
  });

  afterEach(() => {
    container.remove();
    target.remove();
  });

  it('should mount children to target element', () => {
    const child = createVNode('span', null, 'hello');
    const teleport = createVNode('teleport', { to: `#${target.id}` }, [child]);
    (teleport as any).shapeFlag = ShapeFlags.TELEPORT | ShapeFlags.ARRAY_CHILDREN;

    renderer.mount(teleport, container);

    // Children should be in target, not container
    expect(target.innerHTML).toContain('hello');
    // Container should have a placeholder comment
    expect(container.childNodes.length).toBe(1);
    expect(container.childNodes[0]!.nodeType).toBe(Node.COMMENT_NODE);
  });

  it('should mount children to container when disabled', () => {
    const child = createVNode('span', null, 'hello');
    const teleport = createVNode('teleport', { to: `#${target.id}`, disabled: true }, [child]);
    (teleport as any).shapeFlag = ShapeFlags.TELEPORT | ShapeFlags.ARRAY_CHILDREN;

    renderer.mount(teleport, container);

    // Children should be in container (disabled mode)
    expect(container.innerHTML).toContain('hello');
    // Target should be empty
    expect(target.innerHTML).toBe('');
  });

  it('should mount children in place when target not found', () => {
    const child = createVNode('span', null, 'hello');
    const teleport = createVNode('teleport', { to: '#nonexistent' }, [child]);
    (teleport as any).shapeFlag = ShapeFlags.TELEPORT | ShapeFlags.ARRAY_CHILDREN;

    renderer.mount(teleport, container);

    // Children should be in container (fallback)
    expect(container.innerHTML).toContain('hello');
  });
});

describe('Teleport - unmount', () => {
  let container: HTMLDivElement;
  let target: HTMLDivElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = createTestContainer();
    target = createUniqueTarget();
    renderer = createRenderer(new WebRendererHost());
  });

  afterEach(() => {
    container.remove();
    target.remove();
  });

  it('should clean up target anchors and placeholder on unmount', () => {
    const child = createVNode('span', null, 'hello');
    const teleport = createVNode('teleport', { to: `#${target.id}` }, [child]);
    (teleport as any).shapeFlag = ShapeFlags.TELEPORT | ShapeFlags.ARRAY_CHILDREN;

    renderer.mount(teleport, container);

    // Verify mounted state
    expect(target.querySelector('span')).not.toBeNull();
    expect(container.childNodes.length).toBe(1);

    // Unmount
    renderer.unmount(teleport);

    // Target should be cleaned up (anchors removed)
    expect(target.querySelector('span')).toBeNull();
    // Container should be empty
    expect(container.childNodes.length).toBe(0);
  });
});

describe('Teleport - patch (target change)', () => {
  let container: HTMLDivElement;
  let target1: HTMLDivElement;
  let target2: HTMLDivElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = createTestContainer();
    target1 = createUniqueTarget();
    target2 = createUniqueTarget();
    renderer = createRenderer(new WebRendererHost());
  });

  afterEach(() => {
    container.remove();
    target1.remove();
    target2.remove();
  });

  it('should move children when target changes', () => {
    const child = createVNode('span', null, 'hello');
    const teleport1 = createVNode('teleport', { to: `#${target1.id}` }, [child]);
    (teleport1 as any).shapeFlag = ShapeFlags.TELEPORT | ShapeFlags.ARRAY_CHILDREN;

    renderer.mount(teleport1, container);
    expect(target1.querySelector('span')).not.toBeNull();
    expect(target2.querySelector('span')).toBeNull();

    // Patch with new target
    const teleport2 = createVNode('teleport', { to: `#${target2.id}` }, [child]);
    (teleport2 as any).shapeFlag = ShapeFlags.TELEPORT | ShapeFlags.ARRAY_CHILDREN;

    renderer.patch(teleport1, teleport2, container);
    expect(target1.querySelector('span')).toBeNull();
    expect(target2.querySelector('span')).not.toBeNull();
  });

  it('★ 换 to 时用旧 children 搬运：旧目标清空、新目标收到内容', () => {
    const teleport1 = createVNode('teleport', { to: `#${target1.id}` }, [
      createVNode('span', null, 'hello'),
    ]);
    (teleport1 as any).shapeFlag = ShapeFlags.TELEPORT | ShapeFlags.ARRAY_CHILDREN;

    renderer.mount(teleport1, container);
    expect(target1.querySelector('span')).not.toBeNull();

    // 真实渲染路径：新 vnode 的 children 是**尚未挂载**的新 vnode（el 为 null）。
    // 负控：旧实现遍历 n2.children 调 move()，这些新 vnode 没有 el ⇒ 搬运是空转，
    // 内容全部留在旧目标里（旧目标锚点已删，只剩内容节点）。
    const teleport2 = createVNode('teleport', { to: `#${target2.id}` }, [
      createVNode('span', null, 'hello'),
    ]);
    (teleport2 as any).shapeFlag = ShapeFlags.TELEPORT | ShapeFlags.ARRAY_CHILDREN;

    renderer.patch(teleport1, teleport2, container);

    expect(target1.childNodes.length).toBe(0);
    expect(target2.querySelectorAll('span').length).toBe(1);
    expect(target2.textContent).toBe('hello');
    // 原容器仍然只有占位注释
    expect(container.childNodes.length).toBe(1);
  });
});

describe('Teleport - disabled 切换', () => {
  let container: HTMLDivElement;
  let target: HTMLDivElement;

  beforeEach(() => {
    container = createTestContainer();
    target = createUniqueTarget();
  });

  afterEach(() => {
    container.remove();
    target.remove();
  });

  it('★ disabled true→false：内容搬入目标，不重新挂载组件', () => {
    const counters = { mounted: 0, unmounted: 0 };
    const renderer = createCountingRenderer(counters);
    const Child = { name: 'Child', render: () => createVNode('span', null, 'hello') };

    const teleport1 = createVNode('teleport', { to: `#${target.id}`, disabled: true }, [
      createVNode(Child),
    ]);
    (teleport1 as any).shapeFlag = ShapeFlags.TELEPORT | ShapeFlags.ARRAY_CHILDREN;
    renderer.mount(teleport1, container);

    expect(container.querySelectorAll('span').length).toBe(1);
    expect(target.childNodes.length).toBe(0);

    const teleport2 = createVNode('teleport', { to: `#${target.id}` }, [createVNode(Child)]);
    (teleport2 as any).shapeFlag = ShapeFlags.TELEPORT | ShapeFlags.ARRAY_CHILDREN;
    renderer.patch(teleport1, teleport2, container);

    // 负控：旧实现直接 mountTeleport(n2) 重新挂载 ⇒ 组件多挂一次（mounted=2），
    // 容器里旧的 <span> 也没被移除（残留 2 个内容节点）。
    expect(counters).toEqual({ mounted: 1, unmounted: 0 });
    expect(container.querySelectorAll('span').length).toBe(0);
    expect(target.querySelectorAll('span').length).toBe(1);
    expect(target.textContent).toBe('hello');
    // 容器只剩一个新占位注释（旧占位仍在也会让这里 >1）
    expect(container.childNodes.length).toBe(1);
    expect(container.childNodes[0]!.nodeType).toBe(Node.COMMENT_NODE);
  });

  it('★ 多根子组件 + disabled 往返两轮：整组搬移、实例不重建', () => {
    const counters = { mounted: 0, unmounted: 0 };
    const renderer = createCountingRenderer(counters);
    const Child = {
      name: 'MultiRootChild',
      render: () => [
        createVNode('i', null, '1'),
        createVNode('i', null, '2'),
        createVNode('i', null, '3'),
      ],
    };

    const makeTeleport = (disabled: boolean) => {
      const teleport = createVNode('teleport', { to: `#${target.id}`, disabled }, [
        createVNode(Child),
      ]);
      (teleport as any).shapeFlag = ShapeFlags.TELEPORT | ShapeFlags.ARRAY_CHILDREN;
      return teleport;
    };
    const texts = (el: Element) =>
      Array.from(el.querySelectorAll('i')).map((node) => node.textContent);

    // 起点：启用，内容在 target
    const v1 = makeTeleport(false);
    renderer.mount(v1, container);
    expect(texts(target)).toEqual(['1', '2', '3']);

    // 往返 1：启用 → 禁用（整组搬回 container）→ 启用（搬回 target）
    const v2 = makeTeleport(true);
    renderer.patch(v1, v2, container);
    expect(texts(container)).toEqual(['1', '2', '3']);
    expect(target.querySelectorAll('i').length).toBe(0);

    const v3 = makeTeleport(false);
    renderer.patch(v2, v3, container);
    expect(texts(target)).toEqual(['1', '2', '3']);
    expect(container.querySelectorAll('i').length).toBe(0);

    // 往返 2：再来一遍
    const v4 = makeTeleport(true);
    renderer.patch(v3, v4, container);
    expect(texts(container)).toEqual(['1', '2', '3']);

    const v5 = makeTeleport(false);
    renderer.patch(v4, v5, container);

    // 负控：旧 move() 对组件只 insert(vnode.el)（子树起始注释），三个 <i>
    // 会留在原容器；这里要求目标内三根齐全、顺序不变、原容器只剩占位注释。
    expect(texts(target)).toEqual(['1', '2', '3']);
    expect(target.querySelectorAll('i').length).toBe(3);
    expect(container.querySelectorAll('i').length).toBe(0);
    expect(container.childNodes.length).toBe(1);
    expect(counters).toEqual({ mounted: 1, unmounted: 0 });
  });
});

describe('Teleport - move', () => {
  let container: HTMLDivElement;
  let target: HTMLDivElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = createTestContainer();
    target = createUniqueTarget();
    renderer = createRenderer(new WebRendererHost());
  });

  afterEach(() => {
    container.remove();
    target.remove();
  });

  it('should move placeholder comment without moving target children', () => {
    const child = createVNode('span', null, 'hello');
    const teleport = createVNode('teleport', { to: `#${target.id}` }, [child]);
    (teleport as any).shapeFlag = ShapeFlags.TELEPORT | ShapeFlags.ARRAY_CHILDREN;

    renderer.mount(teleport, container);

    // Create a new container and move
    const newContainer = createTestContainer();

    renderer.move(teleport, newContainer, null, null, null);

    // Placeholder should be in new container
    expect(newContainer.childNodes.length).toBe(1);
    // Target children should remain in target
    expect(target.querySelector('span')).not.toBeNull();
  });
});
