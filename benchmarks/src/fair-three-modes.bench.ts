// benchmarks/src/fair-three-modes.bench.ts
// 公平的三种模式性能对比！

import { bench, describe } from 'vitest';
import { createApp as createVDOMApp, defineComponent as defineVDOMComponent } from '@lytjs/core-vnode';
import { createApp as createSignalApp, defineComponent as defineSignalComponent } from '@lytjs/core-signal';
import { createVaporApp, defineVaporComponent } from '@lytjs/renderer';
import { ref } from '@lytjs/reactivity';

// 测试数据
function generateData(count: number) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({ id: i, label: `Item ${i}` });
  }
  return data;
}

describe('三种模式 - 公平对比', () => {
  // ============================================================
  // 场景1: 初始渲染 1000 条
  // ============================================================
  bench('VDOM 模式 - 渲染 1000 条', () => {
    const container = document.createElement('div');
    const data = generateData(1000);
    
    const App = defineVDOMComponent({
      setup() {
        return () => {
          const table = document.createElement('table');
          data.forEach(item => {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.textContent = item.label;
            tr.appendChild(td);
            table.appendChild(tr);
          });
          return table;
        };
      }
    });
    
    const app = createVDOMApp(App);
    app.mount(container);
    app.unmount();
  });

  bench('Signal 模式 - 渲染 1000 条', () => {
    const container = document.createElement('div');
    const data = ref(generateData(1000));
    
    const App = defineSignalComponent({
      setup() {
        return { data };
      },
      template: `
        <table>
          <tr v-for="item in data" :key="item.id">
            <td>{{ item.label }}</td>
          </tr>
        </table>
      `
    });
    
    const app = createSignalApp(App);
    app.mount(container);
    app.unmount();
  });

  bench('Vapor 模式 - 渲染 1000 条', () => {
    const container = document.createElement('div');
    const data = ref(generateData(1000));
    
    const App = defineVaporComponent({
      setup() {
        return { data };
      },
      template: `
        <table>
          <tr v-for="item in data" :key="item.id">
            <td>{{ item.label }}</td>
          </tr>
        </table>
      `
    });
    
    const app = createVaporApp(App);
    app.mount(container);
    app.unmount();
  });

  // ============================================================
  // 场景2: 初始渲染 10000 条
  // ============================================================
  bench('VDOM 模式 - 渲染 10000 条', () => {
    const container = document.createElement('div');
    const data = generateData(10000);
    
    const App = defineVDOMComponent({
      setup() {
        return () => {
          const table = document.createElement('table');
          data.forEach(item => {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.textContent = item.label;
            tr.appendChild(td);
            table.appendChild(tr);
          });
          return table;
        };
      }
    });
    
    const app = createVDOMApp(App);
    app.mount(container);
    app.unmount();
  });

  bench('Signal 模式 - 渲染 10000 条', () => {
    const container = document.createElement('div');
    const data = ref(generateData(10000));
    
    const App = defineSignalComponent({
      setup() {
        return { data };
      },
      template: `
        <table>
          <tr v-for="item in data" :key="item.id">
            <td>{{ item.label }}</td>
          </tr>
        </table>
      `
    });
    
    const app = createSignalApp(App);
    app.mount(container);
    app.unmount();
  });

  bench('Vapor 模式 - 渲染 10000 条', () => {
    const container = document.createElement('div');
    const data = ref(generateData(10000));
    
    const App = defineVaporComponent({
      setup() {
        return { data };
      },
      template: `
        <table>
          <tr v-for="item in data" :key="item.id">
            <td>{{ item.label }}</td>
          </tr>
        </table>
      `
    });
    
    const app = createVaporApp(App);
    app.mount(container);
    app.unmount();
  });
});
