/**
 * Memory Benchmark - Memory usage tests
 * 
 * Tests the memory footprint of various operations.
 */
import { describe, bench } from 'vitest';
import { h, createApp, ref, reactive, computed, watch, effectScope } from '@lytjs/core';

describe('memory benchmark', () => {
  bench('create/destroy 1000 refs', () => {
    const refs: any[] = [];
    for (let i = 0; i < 1000; i++) {
      refs.push(ref(i));
    }
    refs.length = 0;
    return refs.length;
  });

  bench('create/destroy 1000 reactive objects', () => {
    const objects: any[] = [];
    for (let i = 0; i < 1000; i++) {
      objects.push(reactive({ id: i, name: `Item ${i}`, value: i * 2 }));
    }
    objects.length = 0;
    return objects.length;
  });

  bench('create/destroy 1000 computed values', () => {
    const base = ref(0);
    const computeds: any[] = [];
    for (let i = 0; i < 1000; i++) {
      computeds.push(computed(() => base.value + i));
    }
    computeds.length = 0;
    return computeds.length;
  });

  bench('create/destroy 1000 watchers', () => {
    const refs: any[] = [];
    const stoppers: any[] = [];
    
    for (let i = 0; i < 1000; i++) {
      const r = ref(i);
      refs.push(r);
      stoppers.push(watch(r, () => {}));
    }
    
    // Cleanup
    stoppers.forEach(stop => stop());
    refs.length = 0;
    stoppers.length = 0;
    
    return stoppers.length;
  });

  bench('create/destroy 1000 effect scopes', () => {
    const scopes: any[] = [];
    
    for (let i = 0; i < 1000; i++) {
      const scope = effectScope();
      scope.run(() => {
        const r = ref(i);
        watch(r, () => {});
      });
      scopes.push(scope);
    }
    
    // Cleanup
    scopes.forEach(scope => scope.stop());
    scopes.length = 0;
    
    return scopes.length;
  });

  bench('create/destroy 1000 vnodes', () => {
    const vnodes: any[] = [];
    
    for (let i = 0; i < 1000; i++) {
      vnodes.push(h('div', { class: 'item', key: i }, `Item ${i}`));
    }
    
    vnodes.length = 0;
    return vnodes.length;
  });

  bench('create/destroy 1000 component definitions', () => {
    const components: any[] = [];
    
    for (let i = 0; i < 1000; i++) {
      components.push({
        name: `TestComponent${i}`,
        setup() {
          const count = ref(0);
          const doubled = computed(() => count.value * 2);
          return { count, doubled };
        },
        render() {
          return h('div', {}, 'test');
        },
      });
    }
    
    components.length = 0;
    return components.length;
  });

  bench('create/destroy 1000 nested reactive objects', () => {
    const objects: any[] = [];
    
    for (let i = 0; i < 1000; i++) {
      objects.push(reactive({
        id: i,
        nested: {
          level1: {
            level2: {
              level3: {
                value: i,
              },
            },
          },
        },
        array: [1, 2, 3, 4, 5],
      }));
    }
    
    objects.length = 0;
    return objects.length;
  });

  bench('large reactive array operations', () => {
    const arr = reactive<number[]>([]);
    
    // Push 10000 items
    for (let i = 0; i < 10000; i++) {
      arr.push(i);
    }
    
    // Pop all items
    while (arr.length > 0) {
      arr.pop();
    }
    
    return arr.length;
  });
});
