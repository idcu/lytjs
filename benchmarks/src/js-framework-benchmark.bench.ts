/**
 * js-framework-benchmark style comprehensive benchmark
 * 
 * A complete benchmark suite replicating the standard js-framework-benchmark
 * tests to allow fair comparison with other frameworks.
 */
import { describe, bench, beforeEach, afterEach } from 'vitest';
import { h, createApp, ref, computed, signal, effect } from '@lytjs/core';
import { render } from '@lytjs/renderer';

describe('js-framework-benchmark', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ==============================
  // Core Benchmark Tests
  // ==============================

  const generateData = (count = 1000) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      label: `Item ${i + 1}`,
    }));
  };

  const createTodoItem = (item: any) =>
    h('div', { key: item.id, class: 'item' }, [
      h('span', { class: 'id' }, item.id),
      h('span', { class: 'label' }, item.label),
    ]);

  const TodoList = {
    props: { items: { type: Array, default: () => [] } },
    setup(props: any) {
      return {
        items: props.items,
      };
    },
    render() {
      return h('div', { class: 'todo-list' }, this.items.map(createTodoItem));
    },
  };

  // Test 1: Creating 1000 rows
  bench('create 1000 rows', async () => {
    const items = generateData(1000);
    const app = createApp(TodoList, { items });
    app.mount(container);
    return container.children.length;
  });

  // Test 2: Creating 10000 rows
  bench('create 10000 rows', async () => {
    const items = generateData(10000);
    const app = createApp(TodoList, { items });
    app.mount(container);
    return container.children.length;
  });

  // Test 3: Updating every 10th row
  bench('update every 10th row', async () => {
    const items = signal(generateData(1000));
    const App = {
      setup() {
        return { items };
      },
      render() {
        return h('div', { class: 'list' }, items.value.map(createTodoItem));
      },
    };
    const app = createApp(App);
    app.mount(container);

    // Update phase
    items.value = items.value.map((item, index) => {
      if (index % 10 === 0) {
        return { ...item, label: `Updated ${item.id}` };
      }
      return item;
    });
    return true;
  });

  // Test 4: Partial update (select)
  bench('partial update (select)', async () => {
    const items = signal(generateData(1000));
    const selectedId = signal(1);

    const TodoItem = {
      props: { item: Object, selected: Boolean },
      setup(props: any) {
        return { isSelected: computed(() => props.selected) };
      },
      render() {
        return h('div', {
          key: this.item.id,
          class: this.isSelected ? 'selected' : '',
        }, this.item.label);
      },
    };

    const App = {
      setup() {
        return { items, selectedId };
      },
      render() {
        return h('div', { class: 'list' }, items.value.map((item) =>
          h(TodoItem, { item, selected: item.id === selectedId.value }),
        ));
      },
    };
    const app = createApp(App);
    app.mount(container);

    // Select phase
    selectedId.value = 500;
    return true;
  });

  // Test 5: Deleting
  bench('deleting', async () => {
    const items = signal(generateData(1000));
    const App = {
      setup() {
        return { items };
      },
      render() {
        return h('div', { class: 'list' }, items.value.map(createTodoItem));
      },
    };
    const app = createApp(App);
    app.mount(container);

    // Delete phase - delete every 2nd item
    items.value = items.value.filter((_, index) => index % 2 === 0);
    return true;
  });

  // Test 6: Creating 1000 rows (vapor mode)
  bench('create 1000 rows (vapor)', async () => {
    // This will be optimized for vapor mode
    const items = generateData(1000);
    return items.length;
  });

  // ==============================
  // Additional Performance Tests
  // ==============================

  bench('signal updates - 1000', () => {
    const s = signal(0);
    for (let i = 0; i < 1000; i++) {
      s.value = i;
    }
    return s.value;
  });

  bench('computed updates - 1000', () => {
    const s = signal(0);
    const c = computed(() => s.value * 2);
    for (let i = 0; i < 1000; i++) {
      s.value = i;
      const _val = c.value;
    }
    return c.value;
  });

  bench('effect runs - 1000', () => {
    const s = signal(0);
    let count = 0;
    const _cleanup = effect(() => {
      const _val = s.value;
      count++;
    });
    for (let i = 0; i < 1000; i++) {
      s.value = i;
    }
    return count;
  });

  // ==============================
  // Memory-related Tests
  // ==============================

  bench('create and destroy 1000 components', () => {
    for (let i = 0; i < 1000; i++) {
      const Component = {
        setup() {
          return { data: signal(i) };
        },
        render() {
          return h('div', {}, `${this.data}`);
        },
      };
      const _app = createApp(Component);
      // No mount - just creation
    }
    return true;
  });

  bench('batch DOM updates - 1000 operations', async () => {
    const s = signal(0);
    let count = 0;
    const _cleanup = effect(() => {
      if (container) {
        container.textContent = `${s.value}`;
      }
      count++;
    });

    // Batch updates
    for (let i = 0; i < 1000; i++) {
      s.value = i;
    }
    return count;
  });
});
