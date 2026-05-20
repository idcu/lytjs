/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, bench } from 'vitest';
import { signal, signalComputed as computed, effect } from '@lytjs/reactivity';

describe('reactivity benchmark', () => {
  bench('signal get/set', () => {
    const r = signal(0);
    for (let i = 0; i < 1000; i++) {
      r.set(i);
      const _ = r();
    }
  });

  bench('signalComputed evaluation', () => {
    const a = signal(1);
    const b = signal(2);
    const sum = computed(() => a() + b());
    const doubled = computed(() => sum() * 2);
    for (let i = 0; i < 1000; i++) {
      a.set(i);
      b.set(i + 1);
      const _ = doubled();
    }
  });

  bench('effect', () => {
    const count = signal(0);
    let dummy = 0;
    const runner = effect(() => {
      dummy = count();
    });
    for (let i = 0; i < 1000; i++) {
      count.set(i);
    }
    runner.stop();
  });

  bench('signal update performance', () => {
    const s = signal(0);
    for (let i = 0; i < 1000; i++) {
      s.update((v) => v + 1);
      const _ = s();
    }
  });

  bench('computed chain (deep)', () => {
    const a = signal(0);
    const b = computed(() => a() + 1);
    const c = computed(() => b() + 1);
    const d = computed(() => c() + 1);
    const e = computed(() => d() + 1);
    for (let i = 0; i < 1000; i++) {
      a.set(i);
      const _ = e();
    }
  });
});
