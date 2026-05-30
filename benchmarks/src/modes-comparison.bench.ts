// benchmarks/src/modes-comparison.bench.ts
// 三种渲染模式（VDOM、Signal、Vapor 功能与性能对比测试

import { bench, describe, expect, test } from 'vitest';
import { createApp as createVDOMApp, defineComponent as defineVDOMComponent, ref, h } from '@lytjs/core-vnode';
import { createApp as createSignalApp, defineComponent as defineSignalComponent } from '@lytjs/core-signal';
import { createVaporApp, defineVaporComponent } from '@lytjs/renderer';

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
// 功能测试
// ============================================================

describe('三种渲染模式 - 功能验证', () => {
  test('VDOM 模式 - 基本渲染和更新', () => {
    const container = document.createElement('div');
    const data = ref([{ id: 1, label: 'Test 1' }]);

    const App = defineVDOMComponent({
      setup() {
        return () => h('div', { class: 'container' }, [
          h('table', {}, data.value.map(item => h('tr', { key: item.id }, [
            h('td', {}, item.label),
          ])),
        ]));
      },
    });

    const app = createVDOMApp(App);
    app.mount(container);

    expect(container.querySelector('.container')).not.toBeNull();
    expect(container.textContent).toContain('Test 1');
    
    app.unmount();
  });

  test('Signal 模式 - 基本渲染和更新', () => {
    const container = document.createElement('div');
    const data = ref([{ id: 1, label: 'Test 1' }]);

    const App = defineSignalComponent({
      setup() {
        return { data };
      },
      template: `
        <div class="container">
          <table>
            <tr v-for="item in data" :key="item.id">
              <td>{{ item.label }}</td>
            </tr>
          </table>
        </div>
      `,
    });

    const app = createSignalApp(App);
    app.mount(container);

    expect(container.querySelector('.container')).not.toBeNull();
    expect(container.textContent).toContain('Test 1');
    
    app.unmount();
  });

  test('Vapor 模式 - 基本渲染和更新', () => {
    const container = document.createElement('div');
    const data = ref([{ id: 1, label: 'Test 1' }]);

    const App = defineVaporComponent({
      setup() {
        return { data };
      },
      template: `
        <div class="container">
          <table>
            <tr v-for="item in data" :key="item.id">
              <td>{{ item.label }}</td>
            </tr>
          </table>
        </div>
      `,
    });

    const app = createVaporApp(App);
    app.mount(container);

    expect(container.querySelector('.container')).not.toBeNull();
    expect(container.textContent).toContain('Test 1');
    
    app.unmount();
  });
});

// ============================================================
// 性能对比测试
// ============================================================

describe('渲染模式性能对比', () => {
  bench('VDOM 模式 - 初始渲染 1000 项', () => {
    const container = document.createElement('div');
    const data = ref(generateData(1000));

    const App = defineVDOMComponent({
      setup() {
        return () => h('table', {}, data.value.map(item => 
          h('tr', { key: item.id }, [
            h('td', {}, item.label),
          ])),
      ],
    });

    const app = createVDOMApp(App);
    app.mount(container);
    app.unmount();
  });

  bench('Signal 模式 - 初始渲染 1000 项', () => {
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
      `,
    });

    const app = createSignalApp(App);
    app.mount(container);
    app.unmount();
  });

  bench('Vapor 模式 - 初始渲染 1000 项', () => {
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
      `,
    });

    const app = createVaporApp(App);
    app.mount(container);
    app.unmount();
  });

  bench('VDOM 模式 - 初始渲染 10000 项', () => {
    const container = document.createElement('div');
    const data = ref(generateData(10000));

    const App = defineVDOMComponent({
      setup() {
        return () => h('table', {}, data.value.map(item => 
          h('tr', { key: item.id }, [
            h('td', {}, item.label),
          ])),
      },
    });

    const app = createVDOMApp(App);
    app.mount(container);
    app.unmount();
  });

  bench('Signal 模式 - 初始渲染 10000 项', () => {
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
      `,
    });

    const app = createSignalApp(App);
    app.mount(container);
    app.unmount();
  });

  bench('Vapor 模式 - 初始渲染 10000 项', () => {
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
      `,
    });

    const app = createVaporApp(App);
    app.mount(container);
    app.unmount();
  });
});

describe('更新性能对比', () => {
  bench('VDOM 模式 - 更新 10% 数据（1000 项中更新 100 项）', () => {
    const container = document.createElement('div');
    let data = ref(generateData(1000));

    const App = defineVDOMComponent({
      setup() {
        return () => h('table', {}, data.value.map(item => 
          h('tr', { key: item.id }, [
            h('td', {}, item.label),
          ])),
      },
    });

    const app = createVDOMApp(App);
    app.mount(container);

    // 更新数据
    data.value = data.value.map((item, i) => {
      if (i % 10 === 0) {
        return { ...item, label: `${item.label} Updated` };
      }
      return item;
    });

    app.unmount();
  });

  bench('Signal 模式 - 更新 10% 数据（1000 项中更新 100 项）', () => {
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
      `,
    });

    const app = createSignalApp(App);
    app.mount(container);

    // 更新数据
    data.value = data.value.map((item, i) => {
      if (i % 10 === 0) {
        return { ...item, label: `${item.label} Updated` };
      }
      return item;
    });

    app.unmount();
  });

  bench('Vapor 模式 - 更新 10% 数据（1000 项中更新 100 项）', () => {
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
      `,
    });

    const app = createVaporApp(App);
    app.mount(container);

    // 更新数据
    data.value = data.value.map((item, i) => {
      if (i % 10 === 0) {
        return { ...item, label: `${item.label} Updated` };
      }
      return item;
    });

    app.unmount();
  });
});

describe('内存占用测试', () => {
  bench('VDOM 模式 - 完整生命周期（挂载-更新-卸载', () => {
    const container = document.createElement('div');
    const data = ref(generateData(1000));

    const App = defineVDOMComponent({
      setup() {
        return () => h('table', {}, data.value.map(item => 
          h('tr', { key: item.id }, [
            h('td', {}, item.label),
          ])),
      },
    });

    // 挂载
    const app = createVDOMApp(App);
    app.mount(container);

    // 更新
    data.value = data.value.map((item, i) => {
      if (i % 5 === 0) {
        return { ...item, label: `${item.label} Updated` };
      }
      return item;
    });

    // 卸载
    app.unmount();
  });

  bench('Signal 模式 - 完整生命周期（挂载-更新-卸载）', () => {
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
      `,
    });

    // 挂载
    const app = createSignalApp(App);
    app.mount(container);

    // 更新
    data.value = data.value.map((item, i) => {
      if (i % 5 === 0) {
        return { ...item, label: `${item.label} Updated` };
      }
      return item;
    });

    // 卸载
    app.unmount();
  });

  bench('Vapor 模式 - 完整生命周期（挂载-更新-卸载）', () => {
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
      `,
    });

    // 挂载
    const app = createVaporApp(App);
    app.mount(container);

    // 更新
    data.value = data.value.map((item, i) => {
      if (i % 5 === 0) {
        return { ...item, label: `${item.label} Updated` };
      }
      return item;
    });

    // 卸载
    app.unmount();
  });
});
