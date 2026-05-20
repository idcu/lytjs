// benchmarks/src/batch-optimization.bench.ts
// 批量操作和事件委托性能测试
/* eslint-disable @typescript-eslint/no-unused-vars */

import { bench, describe } from 'vitest';
import {
  insertBatch,
  removeBatch,
  diffLists,
  createRenderScheduler,
} from '../../packages/dom-runtime/src/batch';
import { delegateEvent, delegateEventBatch } from '../../packages/dom-runtime/src/events';

describe('批量 DOM 操作性能', () => {
  bench('insertBatch - 1000 个节点', () => {
    const fragment = document.createDocumentFragment();
    const nodes: Node[] = [];
    for (let i = 0; i < 1000; i++) {
      const div = document.createElement('div');
      div.textContent = String(i);
      nodes.push(div);
    }
    insertBatch(nodes, fragment);
  });

  bench('insertBatch - 100 个节点', () => {
    const fragment = document.createDocumentFragment();
    const nodes: Node[] = [];
    for (let i = 0; i < 100; i++) {
      const div = document.createElement('div');
      div.textContent = String(i);
      nodes.push(div);
    }
    insertBatch(nodes, fragment);
  });

  bench('removeBatch - 1000 个节点', () => {
    const container = document.createElement('div');
    for (let i = 0; i < 1000; i++) {
      const div = document.createElement('div');
      div.textContent = String(i);
      container.appendChild(div);
    }
    const nodes = Array.from(container.children);
    removeBatch(nodes);
  });
});

describe('列表差异算法性能', () => {
  bench('diffLists - 1000 个元素（10%变化）', () => {
    const oldList = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` }));
    const newList = oldList.map((item, i) => {
      if (i % 10 === 0) {
        return { id: item.id, value: `updated-${i}` };
      }
      return item;
    });
    newList.push({ id: 1000, value: 'new-item' });
    newList.push({ id: 1001, value: 'new-item-2' });

    diffLists(
      oldList,
      newList,
      (item) => item.id,
      (a, b) => a.value !== b.value,
    );
  });

  bench('diffLists - 1000 个元素（50%变化）', () => {
    const oldList = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` }));
    const newList = Array.from({ length: 500 }, (_, i) => ({
      id: i + 500,
      value: `updated-item-${i}`,
    }));

    diffLists(
      oldList,
      newList,
      (item) => item.id,
      (a, b) => a.value !== b.value,
    );
  });

  bench('diffLists - 100 个元素（完全替换）', () => {
    const oldList = Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item-${i}` }));
    const newList = Array.from({ length: 100 }, (_, i) => ({
      id: i + 100,
      value: `new-item-${i}`,
    }));

    diffLists(
      oldList,
      newList,
      (item) => item.id,
      (a, b) => a.value !== b.value,
    );
  });
});

describe('渲染调度器性能', () => {
  bench('createRenderScheduler - 高频触发（100次）', () => {
    let renderCount = 0;
    const scheduleUpdate = createRenderScheduler(() => {
      renderCount++;
    });

    for (let i = 0; i < 100; i++) {
      scheduleUpdate();
    }
  });

  bench('createRenderScheduler - 中频触发（10次）', () => {
    let renderCount = 0;
    const scheduleUpdate = createRenderScheduler(() => {
      renderCount++;
    });

    for (let i = 0; i < 10; i++) {
      scheduleUpdate();
    }
  });
});

describe('事件委托性能', () => {
  bench('delegateEvent - 1000 个元素', () => {
    const container = document.createElement('div');
    for (let i = 0; i < 1000; i++) {
      const button = document.createElement('button');
      button.dataset.id = String(i);
      container.appendChild(button);
    }

    const unregister = delegateEvent(container, 'click', 'button', (e, target) => {
      const id = target.dataset.id;
    });

    const event = new MouseEvent('click', { bubbles: true });
    const button = container.querySelector('button[data-id="500"]');
    if (button) {
      button.dispatchEvent(event);
    }

    unregister();
  });

  bench('delegateEventBatch - 100 个事件处理器', () => {
    const container = document.createElement('div');
    const handlers: Array<(e: Event, t: Element) => void> = [];

    for (let i = 0; i < 100; i++) {
      handlers.push((e, t) => {
        const id = t.dataset.id;
      });
    }

    const unregister = delegateEventBatch(
      container,
      handlers.map((handler, i) => ({
        eventType: i % 2 === 0 ? 'click' : 'input',
        selector: `button[data-type="${i}"]`,
        handler,
      })),
    );

    unregister();
  });
});

describe('性能对比：批量操作 vs 逐个操作', () => {
  bench('逐个插入 - 100 个节点', () => {
    const container = document.createElement('div');
    for (let i = 0; i < 100; i++) {
      const div = document.createElement('div');
      div.textContent = String(i);
      container.appendChild(div);
    }
  });

  bench('DocumentFragment 批量插入 - 100 个节点', () => {
    const container = document.createElement('div');
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 100; i++) {
      const div = document.createElement('div');
      div.textContent = String(i);
      fragment.appendChild(div);
    }
    container.appendChild(fragment);
  });
});
