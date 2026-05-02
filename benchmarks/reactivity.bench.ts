import { describe, bench } from 'vitest';
import { ref, reactive, computed, watchEffect, stop } from '@lytjs/reactivity';

describe('reactivity benchmark', () => {
  bench('ref get/set', () => {
    const r = ref(0);
    for (let i = 0; i < 1000; i++) {
      r.value = i;
      const _ = r.value;
    }
  });

  bench('reactive get/set', () => {
    const obj = reactive({ a: 0, b: 0, c: 0 });
    for (let i = 0; i < 1000; i++) {
      obj.a = i;
      obj.b = i + 1;
      obj.c = i + 2;
      const _ = obj.a + obj.b + obj.c;
    }
  });

  bench('computed evaluation', () => {
    const a = ref(1);
    const b = ref(2);
    const sum = computed(() => a.value + b.value);
    const doubled = computed(() => sum.value * 2);
    for (let i = 0; i < 1000; i++) {
      a.value = i;
      b.value = i + 1;
      const _ = doubled.value;
    }
  });

  bench('watchEffect', () => {
    const count = ref(0);
    let dummy = 0;
    const runner = watchEffect(() => {
      dummy = count.value;
    });
    for (let i = 0; i < 1000; i++) {
      count.value = i;
    }
    stop(runner);
  });

  bench('reactive nested object access', () => {
    const obj = reactive({
      nested: {
        deep: {
          value: 0,
        },
      },
    });
    for (let i = 0; i < 1000; i++) {
      obj.nested.deep.value = i;
      const _ = obj.nested.deep.value;
    }
  });
});
