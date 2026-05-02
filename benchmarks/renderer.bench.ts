import { describe, bench, beforeAll, afterAll } from 'vitest';
import { createVNode, Fragment } from '@lytjs/vdom';
import { createDOMRenderer } from '@lytjs/renderer';

describe('renderer benchmark', () => {
  let container: HTMLElement;
  let renderer: ReturnType<typeof createDOMRenderer>;

  beforeAll(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = createDOMRenderer();
  });

  afterAll(() => {
    document.body.removeChild(container);
  });

  // FR-3: renderer 测试 DOM 元素创建性能（mount）
  bench('mount - 创建 100 个 DOM 元素', () => {
    for (let i = 0; i < 100; i++) {
      const vnode = createVNode('div', null, `item-${i}`);
      renderer.render(vnode, container);
      renderer.render(null, container);
    }
  });

  bench('mount - 创建带属性的 DOM 元素', () => {
    for (let i = 0; i < 100; i++) {
      const vnode = createVNode(
        'div',
        { id: `el-${i}`, class: 'item', style: { color: 'red' } },
        `item-${i}`,
      );
      renderer.render(vnode, container);
      renderer.render(null, container);
    }
  });

  bench('mount - 创建嵌套 DOM 树 (3层)', () => {
    for (let i = 0; i < 100; i++) {
      const vnode = createVNode('div', { class: 'root' }, [
        createVNode('div', { class: 'middle' }, [createVNode('span', null, `leaf-${i}`)]),
      ]);
      renderer.render(vnode, container);
      renderer.render(null, container);
    }
  });

  bench('mount - 创建 Fragment 多子节点', () => {
    for (let i = 0; i < 100; i++) {
      const vnode = createVNode(Fragment, null, [
        createVNode('span', null, 'a'),
        createVNode('span', null, 'b'),
        createVNode('span', null, 'c'),
      ]);
      renderer.render(vnode, container);
      renderer.render(null, container);
    }
  });

  // FR-4: renderer 测试 DOM 元素更新性能（patch）
  bench('patch - 更新 100 个 DOM 元素的文本', () => {
    const vnode = createVNode('div', null, 'old');
    renderer.render(vnode, container);
    const newNode = createVNode('div', null, 'new');
    renderer.render(newNode, container);
    renderer.render(null, container);
  });

  bench('patch - 更新元素属性 (id/class)', () => {
    const vnode = createVNode('div', { id: 'a', class: 'b' }, null);
    renderer.render(vnode, container);
    const newNode = createVNode('div', { id: 'c', class: 'd' }, null);
    renderer.render(newNode, container);
    renderer.render(null, container);
  });

  bench('patch - 更新元素样式', () => {
    const vnode = createVNode('div', { style: { color: 'red', fontSize: '12px' } }, null);
    renderer.render(vnode, container);
    const newNode = createVNode('div', { style: { color: 'blue', fontSize: '16px' } }, null);
    renderer.render(newNode, container);
    renderer.render(null, container);
  });

  bench('patch - 更新嵌套 DOM 树', () => {
    const vnode = createVNode('div', null, [createVNode('span', { class: 'old' }, 'old text')]);
    renderer.render(vnode, container);
    const newNode = createVNode('div', null, [createVNode('span', { class: 'new' }, 'new text')]);
    renderer.render(newNode, container);
    renderer.render(null, container);
  });

  // FR-5: renderer 测试 DOM 元素删除性能（unmount）
  bench('unmount - 删除 100 个 DOM 元素', () => {
    for (let i = 0; i < 100; i++) {
      const vnode = createVNode('div', null, `item-${i}`);
      renderer.render(vnode, container);
    }
    renderer.render(null, container);
  });

  bench('unmount - 删除嵌套 DOM 树', () => {
    const vnode = createVNode('div', null, [
      createVNode('ul', null, [
        createVNode('li', null, 'item-1'),
        createVNode('li', null, 'item-2'),
        createVNode('li', null, 'item-3'),
        createVNode('li', null, 'item-4'),
        createVNode('li', null, 'item-5'),
      ]),
    ]);
    renderer.render(vnode, container);
    renderer.render(null, container);
  });

  // FR-6: renderer 测试批量更新性能
  bench('batch update - 连续更新 100 次', () => {
    const vnode = createVNode('div', { id: 'batch' }, '0');
    renderer.render(vnode, container);
    for (let i = 1; i <= 100; i++) {
      const updated = createVNode('div', { id: 'batch' }, String(i));
      renderer.render(updated, container);
    }
    renderer.render(null, container);
  });

  bench('batch update - 交替添加和删除子节点', () => {
    for (let i = 0; i < 50; i++) {
      const vnode = createVNode('div', null, [createVNode('span', null, `child-${i}`)]);
      renderer.render(vnode, container);
      renderer.render(null, container);
    }
  });
});
