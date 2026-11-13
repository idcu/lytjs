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
