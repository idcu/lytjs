// benchmarks/src/vapor-list.bench.ts
// Vapor 模式列表渲染性能测试

import { bench, describe } from 'vitest';
import { createVaporListRenderer, diffLists, insertBatch } from '../../packages/dom-runtime/src/batch';

describe('Vapor 列表渲染性能', () => {
  bench('createVaporListRenderer - 初始渲染 1000 项', () => {
    const container = document.createElement('div');
    const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }));

    const renderer = createVaporListRenderer(container, {
      keyFn: (item) => item.id,
      renderItem: (item, index) => {
        const div = document.createElement('div');
        div.textContent = `${index}: ${item.name}`;
        div.className = 'list-item';
        div.dataset.id = String(item.id);
        return div;
      },
    });

    renderer.render(items);
    renderer.destroy();
  });

  bench('createVaporListRenderer - 增量更新（10%变化）', () => {
    const container = document.createElement('div');
    const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }));

    const renderer = createVaporListRenderer(container, {
      keyFn: (item) => item.id,
      renderItem: (item, index) => {
        const div = document.createElement('div');
        div.textContent = `${index}: ${item.name}`;
        div.className = 'list-item';
        div.dataset.id = String(item.id);
        return div;
      },
    });

    // 初始渲染
    renderer.render(items);

    // 创建变化的数据（10%更新 + 少量新增和删除）
    const updatedItems = items.map((item, i) => {
      if (i % 10 === 0) {
        return { ...item, name: `Updated Item ${i}` };
      }
      return item;
    });
    updatedItems.splice(100, 50); // 删除 50 项
    updatedItems.push(
      { id: 1000, name: 'New Item 1000' },
      { id: 1001, name: 'New Item 1001' },
    );

    // 增量更新
    renderer.render(updatedItems);
    renderer.destroy();
  });

  bench('createVaporListRenderer - 列表重排序', () => {
    const container = document.createElement('div');
    const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }));

    const renderer = createVaporListRenderer(container, {
      keyFn: (item) => item.id,
      renderItem: (item, index) => {
        const div = document.createElement('div');
        div.textContent = `${index}: ${item.name}`;
        div.className = 'list-item';
        div.dataset.id = String(item.id);
        return div;
      },
    });

    // 初始渲染
    renderer.render(items);

    // 倒序排列
    const reversedItems = [...items].reverse();

    // 增量更新（仅重排序，无其他变化）
    renderer.render(reversedItems);
    renderer.destroy();
  });

  bench('createVaporListRenderer - 高频小量更新', () => {
    const container = document.createElement('div');
    let items = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }));

    const renderer = createVaporListRenderer(container, {
      keyFn: (item) => item.id,
      renderItem: (item, index) => {
        const div = document.createElement('div');
        div.textContent = `${index}: ${item.name}`;
        div.className = 'list-item';
        div.dataset.id = String(item.id);
        return div;
      },
    });

    renderer.render(items);

    // 模拟 10 次高频更新，每次只改变少数项
    for (let i = 0; i < 10; i++) {
      items = items.map((item, idx) => {
        if (idx >= 10 && idx <= 20) {
          return { ...item, name: `Updated ${i}: Item ${idx}` };
        }
        return item;
      });
      renderer.render(items);
    }

    renderer.destroy();
  });

  bench('传统 DOM 操作 - 完全替换 1000 项', () => {
    const container = document.createElement('div');
    const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }));

    // 完全替换
    container.innerHTML = '';
    for (const [index, item] of items.entries()) {
      const div = document.createElement('div');
      div.textContent = `${index}: ${item.name}`;
      div.className = 'list-item';
      div.dataset.id = String(item.id);
      container.appendChild(div);
    }
  });
});

describe('列表差异算法性能', () => {
  bench('diffLists - 1000 个元素（10%更新）', () => {
    const oldList = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` }));
    const newList = oldList.map((item, i) => {
      if (i % 10 === 0) {
        return { ...item, value: `updated-${i}` };
      }
      return item;
    });
    newList.push({ id: 1000, value: 'new-item' });
    newList.push({ id: 1001, value: 'new-item-2' });

    diffLists(oldList, newList, (item) => item.id, (a, b) => a.value !== b.value);
  });

  bench('diffLists - 1000 个元素（50%删除，50%新增）', () => {
    const oldList = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` }));
    const newList = Array.from({ length: 500 }, (_, i) => ({
      id: i + 1000,
      value: `new-item-${i}`,
    }));

    diffLists(oldList, newList, (item) => item.id, (a, b) => a.value !== b.value);
  });
});

describe('性能对比：Vapor 列表 vs 传统渲染', () => {
  bench('Vapor 列表 - 初始渲染 5000 项', () => {
    const container = document.createElement('div');
    const items = Array.from({ length: 5000 }, (_, i) => ({ id: i, name: `Item ${i}` }));

    const renderer = createVaporListRenderer(container, {
      keyFn: (item) => item.id,
      renderItem: (item, index) => {
        const div = document.createElement('div');
        div.textContent = `${index}: ${item.name}`;
        div.className = 'list-item';
        div.dataset.id = String(item.id);
        return div;
      },
    });

    renderer.render(items);
    renderer.destroy();
  });

  bench('DocumentFragment 批量插入 - 5000 项', () => {
    const container = document.createElement('div');
    const fragment = document.createDocumentFragment();
    const items = Array.from({ length: 5000 }, (_, i) => ({ id: i, name: `Item ${i}` }));

    for (const [index, item] of items.entries()) {
      const div = document.createElement('div');
      div.textContent = `${index}: ${item.name}`;
      div.className = 'list-item';
      div.dataset.id = String(item.id);
      fragment.appendChild(div);
    }

    container.appendChild(fragment);
  });
});
