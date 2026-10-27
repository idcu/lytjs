/**
 * `getters` 必须收到 state（P1 回归）
 *
 * 此前 `computed(() => getterFn.call(thisContext))` —— **不传任何实参**，
 * 于是 Pinia 的标准写法 `getters: { double: (state) => state.n * 2 }` 里
 * `state` 是 `undefined`，直接 `TypeError: Cannot read properties of undefined`。
 * 而 `getters: { double() { return this.n * 2 } }`（用 this）恰好能跑，
 * 所以只测了 this 写法的用例全绿。
 */

import { describe, it, expect } from 'vitest';
import { defineStore, createPinia, setActivePinia } from '../src/index';

describe('store getters 的签名（P1 回归）', () => {
  it('getter 收到 state 作为第一个实参', () => {
    setActivePinia(createPinia());
    const useStore = defineStore('getterState', {
      state: () => ({ n: 2 }),
      getters: {
        double: (state: { n: number }) => state.n * 2,
      },
    });

    const store = useStore();
    expect(store.double).toBe(4);
  });

  it('getter 可以用第二个实参访问其它 getters', () => {
    setActivePinia(createPinia());
    const useStore = defineStore('getterChain', {
      state: () => ({ n: 3 }),
      getters: {
        double: (state: { n: number }) => state.n * 2,
        quadruple: (_state: unknown, getters: { double: number }) => getters.double * 2,
      },
    });

    const store = useStore();
    expect(store.quadruple).toBe(12);
  });

  it('this 写法仍然可用（向后兼容）', () => {
    setActivePinia(createPinia());
    const useStore = defineStore('getterThis', {
      state: () => ({ n: 5 }),
      getters: {
        triple(): number {
          return (this as unknown as { n: number }).n * 3;
        },
      },
    });

    const store = useStore();
    expect(store.triple).toBe(15);
  });
});
