/**
 * Render Benchmark - js-framework-benchmark style rendering tests
 *
 * Tests the performance of initial rendering operations.
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, bench } from 'vitest';
import { h } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

describe('render benchmark', () => {
  // Helper to create a simple component
  const createItem = (id: number, label: string) => h('div', { key: id, class: 'item' }, label);
  const createRow = (id: number, label: string) =>
    h('tr', { key: id }, [h('td', {}, `${id}`), h('td', {}, label), h('td', {}, 'Some content')]);

  bench('create 1000 nodes (divs)', () => {
    const nodes: any[] = [];
    for (let i = 0; i < 1000; i++) {
      nodes.push(h('div', { class: 'item' }, `Item ${i}`));
    }
    return nodes.length;
  });

  bench('create 10000 nodes (divs)', () => {
    const nodes: any[] = [];
    for (let i = 0; i < 10000; i++) {
      nodes.push(h('div', { class: 'item' }, `Item ${i}`));
    }
    return nodes.length;
  });

  bench('create 1000 signals (simple)', () => {
    const signals: any[] = [];
    for (let i = 0; i < 1000; i++) {
      const count = signal(i);
      signals.push(count);
    }
    return signals.length;
  });

  bench('create 1000 rows (table)', () => {
    const rows: any[] = [];
    for (let i = 0; i < 1000; i++) {
      rows.push(createRow(i, `Row ${i}`));
    }
    return rows.length;
  });

  bench('create nested structure (10 levels deep)', () => {
    const createNested = (depth: number): any => {
      if (depth === 0) {
        return h('span', {}, 'leaf');
      }
      return h('div', { class: `level-${depth}` }, createNested(depth - 1));
    };
    return createNested(10);
  });

  bench('create wide tree (100 siblings)', () => {
    const children: any[] = [];
    for (let i = 0; i < 100; i++) {
      children.push(h('div', {}, `Child ${i}`));
    }
    return h('div', {}, children);
  });

  bench('create complex component tree', () => {
    const createTree = (depth: number, breadth: number): any => {
      if (depth === 0) {
        return h('span', {}, 'leaf');
      }
      const children: any[] = [];
      for (let i = 0; i < breadth; i++) {
        children.push(createTree(depth - 1, breadth));
      }
      return h('div', { class: `node-${depth}` }, children);
    };
    return createTree(3, 5);
  });
});
