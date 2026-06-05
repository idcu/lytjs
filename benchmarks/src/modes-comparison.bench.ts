// benchmarks/src/modes-comparison.bench.ts
// 三种渲染模式（VDOM、Signal、Vapor 功能与性能对比测试

import { bench, describe } from 'vitest';
import { ref } from '@lytjs/reactivity';

const adjectives = ['pretty', 'large', 'big', 'small', 'tall'];
const colours = ['red', 'yellow', 'blue', 'green', 'pink'];
const nouns = ['table', 'chair', 'house', 'bbq', 'desk'];

function generateId() {
  return Math.floor(Math.random() * 1000000);
}

function generateRandomString() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const col = colours[Math.floor(Math.random() * colours.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return adj + ' ' + col + ' ' + noun;
}

function generateData(count: number) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({ id: generateId(), label: generateRandomString() });
  }
  return data;
}

// ============================================================
// 性能对比测试
// ============================================================

describe('渲染模式性能对比', () => {
  bench('VDOM 模式 - 初始渲染 1000 项', () => {
    const container = document.createElement('div');
    const data = generateData(1000);
    
    // 原生 DOM 渲染（模拟 VDOM）
    const table = document.createElement('table');
    data.forEach(item => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.textContent = item.label;
      tr.appendChild(td);
      table.appendChild(tr);
    });
    container.appendChild(table);
    
    return container.children.length;
  });

  bench('Vapor 模式 - 直接 DOM 操作 1000 项', () => {
    const container = document.createElement('div');
    const data = generateData(1000);
    
    // 使用 DocumentFragment
    const frag = document.createDocumentFragment();
    const table = document.createElement('table');
    
    data.forEach(item => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.textContent = item.label;
      tr.appendChild(td);
      table.appendChild(tr);
    });
    
    frag.appendChild(table);
    container.appendChild(frag);
    
    return container.children.length;
  });

  bench('Signal 模式 - 数据创建 1000 项', () => {
    const data = ref(generateData(1000));
    return data.value.length;
  });

  bench('VDOM 模式 - 初始渲染 10000 项', () => {
    const container = document.createElement('div');
    const data = generateData(10000);
    
    const table = document.createElement('table');
    data.forEach(item => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.textContent = item.label;
      tr.appendChild(td);
      table.appendChild(tr);
    });
    container.appendChild(table);
    
    return container.children.length;
  });

  bench('Vapor 模式 - 直接 DOM 操作 10000 项', () => {
    const container = document.createElement('div');
    const data = generateData(10000);
    
    const frag = document.createDocumentFragment();
    const table = document.createElement('table');
    
    data.forEach(item => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.textContent = item.label;
      tr.appendChild(td);
      table.appendChild(tr);
    });
    
    frag.appendChild(table);
    container.appendChild(frag);
    
    return container.children.length;
  });

  bench('Signal 模式 - 数据创建 10000 项', () => {
    const data = ref(generateData(10000));
    return data.value.length;
  });
});

describe('更新性能对比', () => {
  bench('VDOM 模式 - 更新 10% 数据（1000 项中更新 100 项）', () => {
    const container = document.createElement('div');
    let data = generateData(1000);
    
    // 初始渲染
    const table = document.createElement('table');
    data.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.dataset.index = String(index);
      const td = document.createElement('td');
      td.textContent = item.label;
      tr.appendChild(td);
      table.appendChild(tr);
    });
    container.appendChild(table);
    
    // 更新数据
    data = data.map((item, i) => {
      if (i % 10 === 0) {
        return { ...item, label: `${item.label} Updated` };
      }
      return item;
    });
    
    // 更新 DOM
    data.forEach((item, index) => {
      if (index % 10 === 0) {
        const tr = table.querySelector(`tr[data-index="${index}"]`);
        if (tr) {
          const td = tr.querySelector('td');
          if (td) td.textContent = item.label;
        }
      }
    });
    
    return container.children.length;
  });

  bench('Vapor 模式 - 直接更新 10% 数据', () => {
    const container = document.createElement('div');
    let data = generateData(1000);
    
    // 初始渲染
    const table = document.createElement('table');
    const rows: HTMLTableRowElement[] = [];
    
    data.forEach((item, index) => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.textContent = item.label;
      tr.appendChild(td);
      table.appendChild(tr);
      rows.push(tr);
    });
    container.appendChild(table);
    
    // 更新数据
    data = data.map((item, i) => {
      if (i % 10 === 0) {
        return { ...item, label: `${item.label} Updated` };
      }
      return item;
    });
    
    // 直接更新 DOM
    data.forEach((item, index) => {
      if (index % 10 === 0 && rows[index]) {
        const td = rows[index].querySelector('td');
        if (td) td.textContent = item.label;
      }
    });
    
    return container.children.length;
  });

  bench('Signal 模式 - 响应式数据更新', () => {
    const data = ref(generateData(1000));
    
    // 更新数据
    data.value = data.value.map((item, i) => {
      if (i % 10 === 0) {
        return { ...item, label: `${item.label} Updated` };
      }
      return item;
    });
    
    return data.value.length;
  });
});

describe('完整生命周期测试', () => {
  bench('VDOM 模式 - 完整生命周期（渲染-更新-清理）', () => {
    const container = document.createElement('div');
    let data = generateData(1000);
    
    // 渲染
    const table = document.createElement('table');
    data.forEach(item => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.textContent = item.label;
      tr.appendChild(td);
      table.appendChild(tr);
    });
    container.appendChild(table);
    
    // 更新
    data = data.map((item, i) => {
      if (i % 5 === 0) {
        return { ...item, label: `${item.label} Updated` };
      }
      return item;
    });
    
    table.innerHTML = '';
    data.forEach(item => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.textContent = item.label;
      tr.appendChild(td);
      table.appendChild(tr);
    });
    
    // 清理
    container.innerHTML = '';
    
    return container.children.length;
  });

  bench('Vapor 模式 - 完整生命周期（渲染-更新-清理）', () => {
    const container = document.createElement('div');
    let data = generateData(1000);
    
    // 渲染
    const frag = document.createDocumentFragment();
    const table = document.createElement('table');
    
    data.forEach(item => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.textContent = item.label;
      tr.appendChild(td);
      table.appendChild(tr);
    });
    
    frag.appendChild(table);
    container.appendChild(frag);
    
    // 更新
    data = data.map((item, i) => {
      if (i % 5 === 0) {
        return { ...item, label: `${item.label} Updated` };
      }
      return item;
    });
    
    table.innerHTML = '';
    data.forEach(item => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.textContent = item.label;
      tr.appendChild(td);
      table.appendChild(tr);
    });
    
    // 清理
    container.innerHTML = '';
    
    return container.children.length;
  });

  bench('Signal 模式 - 完整响应式生命周期', () => {
    const data = ref(generateData(1000));
    
    // 更新
    data.value = data.value.map((item, i) => {
      if (i % 5 === 0) {
        return { ...item, label: `${item.label} Updated` };
      }
      return item;
    });
    
    return data.value.length;
  });
});
