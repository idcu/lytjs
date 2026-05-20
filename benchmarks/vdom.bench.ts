/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, bench } from 'vitest';
import { createVNode, createTextVNode, cloneVNode, mergeProps } from '@lytjs/vdom';

describe('vdom benchmark', () => {
  bench('createVNode', () => {
    for (let i = 0; i < 1000; i++) {
      createVNode('div', { id: 'test', class: 'foo bar' }, 'hello');
    }
  });

  bench('createVNode with children array', () => {
    const children = Array.from({ length: 10 }, (_, i) => createVNode('span', null, `item-${i}`));
    for (let i = 0; i < 100; i++) {
      createVNode('ul', { class: 'list' }, children);
    }
  });

  bench('createTextVNode', () => {
    for (let i = 0; i < 1000; i++) {
      createTextVNode('text content');
    }
  });

  bench('cloneVNode', () => {
    const vnode = createVNode('div', { id: 'original', class: 'cls' }, 'content');
    for (let i = 0; i < 1000; i++) {
      cloneVNode(vnode, { class: `cls-${i}` });
    }
  });

  bench('mergeProps', () => {
    const a = { class: 'a', style: { color: 'red' }, onClick: () => {} };
    const b = { class: 'b', style: { fontSize: '14px' }, onClick: () => {} };
    const c = { class: 'c', id: 'merged' };
    for (let i = 0; i < 1000; i++) {
      mergeProps(a, b, c);
    }
  });

  bench('create nested VNode tree (100 nodes)', () => {
    function buildTree(depth: number, breadth: number): any {
      if (depth === 0) return createTextVNode('leaf');
      const children = Array.from({ length: breadth }, () => buildTree(depth - 1, breadth));
      return createVNode('div', null, children);
    }
    buildTree(3, 4); // ~85 nodes
  });
});
